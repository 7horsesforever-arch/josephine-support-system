import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { decryptSecret } from "@/lib/server/encryption";

type CanvasImportRequest = {
  canvasBaseUrl?: string;
  canvasAccessToken?: string;
  courseIds?: number[];
};

type CanvasConnectionRow = {
  canvas_base_url: string;
  encrypted_access_token: string;
  token_iv: string;
  token_auth_tag: string;
  expires_at: string;
};

type CanvasCourse = {
  id: number;
  name?: string;
  course_code?: string;
  workflow_state?: string;
};

type CanvasAssignment = {
  id: number;
  course_id: number;
  name?: string;
  due_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  workflow_state?: string;
  updated_at?: string;
};

type SchoolAssignmentRow = {
  user_id: string;
  source: "canvas";
  source_course_id: string;
  source_assignment_id: string;
  course_name: string;
  title: string;
  due_at: string | null;
  url: string | null;
  points_possible: number | null;
  workflow_state: string | null;
  imported_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function getSupabaseForRequest(accessToken: string) {
  if (!supabaseUrl || !supabasePublishableKey) return null;

  return createClient(supabaseUrl, supabasePublishableKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function normalizeCanvasBaseUrl(value: string) {
  const url = new URL(value);

  if (url.protocol !== "https:") {
    throw new Error("Canvas URL must use HTTPS.");
  }

  const hostname = url.hostname.toLowerCase();
  const isAllowedHost =
    hostname === "canvas.colostate.edu" ||
    hostname.endsWith(".instructure.com");

  if (!isAllowedHost) {
    throw new Error("Canvas URL must be canvas.colostate.edu or an Instructure Canvas host.");
  }

  return `${url.origin}/api/v1`;
}

function getNextLink(linkHeader: string | null) {
  if (!linkHeader) return null;

  const links = linkHeader.split(",").map((part) => part.trim());
  const next = links.find((part) => part.includes('rel="next"'));
  const match = next?.match(/<([^>]+)>/);
  return match?.[1] ?? null;
}

async function fetchCanvasPages<T>(firstUrl: string, canvasAccessToken: string) {
  const records: T[] = [];
  let nextUrl: string | null = firstUrl;
  let pageCount = 0;

  while (nextUrl && pageCount < 10) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${canvasAccessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Canvas returned ${response.status} for ${nextUrl}`);
    }

    const page = (await response.json()) as T[];
    records.push(...page);
    nextUrl = getNextLink(response.headers.get("link"));
    pageCount += 1;
  }

  return records;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const appAccessToken = authorization?.replace(/^Bearer\s+/i, "");

  if (!appAccessToken) {
    return NextResponse.json({ error: "Sign in before importing assignments." }, { status: 401 });
  }

  const supabase = getSupabaseForRequest(appAccessToken);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(appAccessToken);

  if (userError || !user) {
    return NextResponse.json({ error: "Invalid app session." }, { status: 401 });
  }

  let body: CanvasImportRequest;
  try {
    body = (await request.json()) as CanvasImportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let canvasBaseUrl = body.canvasBaseUrl;
  let canvasAccessToken = body.canvasAccessToken;
  let usingSavedConnection = false;

  if (!canvasAccessToken) {
    const { data: savedConnection, error: connectionError } = await supabase
      .from("canvas_connections")
      .select("canvas_base_url,encrypted_access_token,token_iv,token_auth_tag,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) {
      return NextResponse.json({ error: connectionError.message }, { status: 500 });
    }

    const connection = savedConnection as CanvasConnectionRow | null;
    if (!connection) {
      return NextResponse.json(
        { error: "Save a Canvas connection or enter a Canvas API token before importing." },
        { status: 400 },
      );
    }

    if (new Date(connection.expires_at) <= new Date()) {
      return NextResponse.json(
        { error: "Saved Canvas connection has expired. Save a new token before importing." },
        { status: 400 },
      );
    }

    try {
      canvasAccessToken = decryptSecret({
        encryptedValue: connection.encrypted_access_token,
        iv: connection.token_iv,
        authTag: connection.token_auth_tag,
      });
    } catch {
      return NextResponse.json(
        { error: "Saved Canvas connection could not be decrypted. Save a new token." },
        { status: 500 },
      );
    }

    canvasBaseUrl = connection.canvas_base_url;
    usingSavedConnection = true;
  }

  if (!canvasBaseUrl || !canvasAccessToken) {
    return NextResponse.json(
      { error: "canvasBaseUrl and canvasAccessToken are required." },
      { status: 400 },
    );
  }

  let canvasApiBase: string;
  try {
    canvasApiBase = normalizeCanvasBaseUrl(canvasBaseUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid Canvas URL." },
      { status: 400 },
    );
  }

  try {
    const courses: CanvasCourse[] = body.courseIds?.length
      ? body.courseIds.map((id) => ({ id }))
      : await fetchCanvasPages<CanvasCourse>(
          `${canvasApiBase}/courses?enrollment_state=active&per_page=100`,
          canvasAccessToken,
        );

    const activeCourses = courses.filter((course) => course.id);
    const assignmentRows: SchoolAssignmentRow[] = [];

    for (const course of activeCourses) {
      const assignments = await fetchCanvasPages<CanvasAssignment>(
        `${canvasApiBase}/courses/${course.id}/assignments?bucket=upcoming&per_page=100`,
        canvasAccessToken,
      );

      assignmentRows.push(
        ...assignments.map((assignment) => ({
          user_id: user.id,
          source: "canvas" as const,
          source_course_id: String(course.id),
          source_assignment_id: String(assignment.id),
          course_name: course.name ?? course.course_code ?? `Course ${course.id}`,
          title: assignment.name ?? "Untitled assignment",
          due_at: assignment.due_at ?? null,
          url: assignment.html_url ?? null,
          points_possible: assignment.points_possible ?? null,
          workflow_state: assignment.workflow_state ?? null,
          imported_at: new Date().toISOString(),
        })),
      );
    }

    if (assignmentRows.length > 0) {
      const { error: upsertError } = await supabase
        .from("school_assignments")
        .upsert(assignmentRows, {
          onConflict: "user_id,source,source_course_id,source_assignment_id",
        });

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    if (usingSavedConnection) {
      await supabase
        .from("canvas_connections")
        .update({ last_imported_at: new Date().toISOString() })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      imported: assignmentRows.length,
      coursesChecked: activeCourses.length,
      usedSavedConnection: usingSavedConnection,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Canvas import failed." },
      { status: 502 },
    );
  }
}
