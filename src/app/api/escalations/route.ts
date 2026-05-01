import { NextRequest, NextResponse } from "next/server";

type EscalationRequest = {
  taskId?: string;
  taskTitle?: string;
  alertType?: "gentle" | "strong" | "failsafe_sms";
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: EscalationRequest;
  try {
    body = (await request.json()) as EscalationRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.taskId || !body.taskTitle || !body.alertType) {
    return NextResponse.json(
      { error: "taskId, taskTitle, and alertType are required" },
      { status: 400 },
    );
  }

  // SMS/email delivery belongs here, on the server, so provider secrets never
  // ship to the browser. Wire Twilio or another provider after auth is live.
  return NextResponse.json(
    {
      status: "queued",
      delivery: "not_configured",
      taskId: body.taskId,
      alertType: body.alertType,
    },
    { status: 202 },
  );
}
