"use client";

import { useEffect, useMemo, useState } from "react";

type PayPeriod = "weekly" | "biweekly" | "monthly";

type PaycheckInputs = {
  hourlyRate: number;
  hoursWorked: number;
  overtimeHours: number;
  federalRate: number;
  coloradoRate: number;
  preTaxDeductions: number;
  otherDeductions: number;
  payPeriod: PayPeriod;
};

const storageKey = "josephine-work-paycheck-estimator";
const ficaRate = 7.65;

const defaultInputs: PaycheckInputs = {
  hourlyRate: 16,
  hoursWorked: 12,
  overtimeHours: 0,
  federalRate: 10,
  coloradoRate: 4.4,
  preTaxDeductions: 0,
  otherDeductions: 0,
  payPeriod: "weekly",
};

function currency(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}%`;
}

function safeNumber(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function updateNumber(
  setter: (nextInputs: (current: PaycheckInputs) => PaycheckInputs) => void,
  field: keyof PaycheckInputs,
  value: string,
) {
  setter((current) => ({
    ...current,
    [field]: safeNumber(Number(value)),
  }));
}

export function WorkPaycheckEstimator() {
  const [inputs, setInputs] = useState<PaycheckInputs>(defaultInputs);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;

      try {
        const parsed = JSON.parse(saved) as Partial<PaycheckInputs>;
        setInputs({
          ...defaultInputs,
          ...parsed,
          hourlyRate: safeNumber(Number(parsed.hourlyRate ?? defaultInputs.hourlyRate)),
          hoursWorked: safeNumber(Number(parsed.hoursWorked ?? defaultInputs.hoursWorked)),
          overtimeHours: safeNumber(Number(parsed.overtimeHours ?? defaultInputs.overtimeHours)),
          federalRate: safeNumber(Number(parsed.federalRate ?? defaultInputs.federalRate)),
          coloradoRate: safeNumber(Number(parsed.coloradoRate ?? defaultInputs.coloradoRate)),
          preTaxDeductions: safeNumber(
            Number(parsed.preTaxDeductions ?? defaultInputs.preTaxDeductions),
          ),
          otherDeductions: safeNumber(
            Number(parsed.otherDeductions ?? defaultInputs.otherDeductions),
          ),
          payPeriod:
            parsed.payPeriod === "biweekly" || parsed.payPeriod === "monthly"
              ? parsed.payPeriod
              : defaultInputs.payPeriod,
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify(inputs));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [inputs]);

  const estimate = useMemo(() => {
    const overtimeHours = Math.min(inputs.overtimeHours, inputs.hoursWorked);
    const regularHours = Math.max(0, inputs.hoursWorked - overtimeHours);
    const regularPay = regularHours * inputs.hourlyRate;
    const overtimePay = overtimeHours * inputs.hourlyRate * 1.5;
    const grossPay = regularPay + overtimePay;
    const taxablePay = Math.max(0, grossPay - inputs.preTaxDeductions);
    const socialSecurity = taxablePay * 0.062;
    const medicare = taxablePay * 0.0145;
    const fica = socialSecurity + medicare;
    const federal = taxablePay * (inputs.federalRate / 100);
    const colorado = taxablePay * (inputs.coloradoRate / 100);
    const totalDeductions =
      inputs.preTaxDeductions + inputs.otherDeductions + fica + federal + colorado;
    const takeHome = Math.max(0, grossPay - totalDeductions);

    return {
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      grossPay,
      taxablePay,
      socialSecurity,
      medicare,
      fica,
      federal,
      colorado,
      totalDeductions,
      takeHome,
    };
  }, [inputs]);

  const takeHomePercent =
    estimate.grossPay > 0 ? (estimate.takeHome / estimate.grossPay) * 100 : 0;

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-teal-800">
            Paycheck Estimator
          </p>
          <h2 className="mt-2 text-2xl font-black">What Will I Actually Get?</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-600">
            Enter pay and hours to estimate take-home pay after payroll taxes
            and deductions. This is a planning estimate; the real paycheck
            depends on employer payroll settings and tax forms.
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
          Saves on this device
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <div className="grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Pay period
            <select
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-950"
              value={inputs.payPeriod}
              onChange={(event) =>
                setInputs((current) => ({
                  ...current,
                  payPeriod: event.target.value as PayPeriod,
                }))
              }
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Every 2 weeks</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Hourly pay
            <input
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
              min="0"
              step="0.25"
              type="number"
              value={inputs.hourlyRate}
              onChange={(event) =>
                updateNumber(setInputs, "hourlyRate", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Total hours worked
            <input
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
              min="0"
              step="0.25"
              type="number"
              value={inputs.hoursWorked}
              onChange={(event) =>
                updateNumber(setInputs, "hoursWorked", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Overtime hours
            <input
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
              min="0"
              step="0.25"
              type="number"
              value={inputs.overtimeHours}
              onChange={(event) =>
                updateNumber(setInputs, "overtimeHours", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Federal withholding estimate
            <div className="flex min-h-11 items-center rounded-md border border-stone-300 bg-white px-3">
              <input
                className="w-full text-sm text-stone-950 outline-none"
                min="0"
                step="0.5"
                type="number"
                value={inputs.federalRate}
                onChange={(event) =>
                  updateNumber(setInputs, "federalRate", event.target.value)
                }
              />
              <span className="text-sm font-bold text-stone-500">%</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Colorado withholding estimate
            <div className="flex min-h-11 items-center rounded-md border border-stone-300 bg-white px-3">
              <input
                className="w-full text-sm text-stone-950 outline-none"
                min="0"
                step="0.1"
                type="number"
                value={inputs.coloradoRate}
                onChange={(event) =>
                  updateNumber(setInputs, "coloradoRate", event.target.value)
                }
              />
              <span className="text-sm font-bold text-stone-500">%</span>
            </div>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Pre-tax deductions
            <input
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
              min="0"
              step="1"
              type="number"
              value={inputs.preTaxDeductions}
              onChange={(event) =>
                updateNumber(setInputs, "preTaxDeductions", event.target.value)
              }
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-stone-800">
            Other deductions
            <input
              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm text-stone-950"
              min="0"
              step="1"
              type="number"
              value={inputs.otherDeductions}
              onChange={(event) =>
                updateNumber(setInputs, "otherDeductions", event.target.value)
              }
            />
          </label>
        </div>

        <aside className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <p className="text-xs font-bold uppercase">Estimated take-home</p>
          <strong className="mt-2 block text-4xl font-black">
            {currency(estimate.takeHome)}
          </strong>
          <p className="mt-2 text-sm">
            About {percent(takeHomePercent)} of gross pay for this{" "}
            {inputs.payPeriod === "biweekly"
              ? "2-week"
              : inputs.payPeriod}{" "}
            period.
          </p>

          <div className="mt-5 grid gap-2 text-sm">
            <div className="flex justify-between gap-3 rounded-md bg-white p-3">
              <span>Gross pay</span>
              <strong>{currency(estimate.grossPay)}</strong>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-white p-3">
              <span>Regular pay</span>
              <strong>{currency(estimate.regularPay)}</strong>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-white p-3">
              <span>Overtime pay</span>
              <strong>{currency(estimate.overtimePay)}</strong>
            </div>
            <div className="flex justify-between gap-3 rounded-md bg-white p-3">
              <span>Total deductions</span>
              <strong>{currency(estimate.totalDeductions)}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <h3 className="font-bold text-stone-950">Payroll Taxes</h3>
          <p className="mt-2">
            FICA is estimated at {percent(ficaRate)}: Social Security{" "}
            {currency(estimate.socialSecurity)} and Medicare{" "}
            {currency(estimate.medicare)}.
          </p>
        </article>

        <article className="rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <h3 className="font-bold text-stone-950">Income Withholding</h3>
          <p className="mt-2">
            Federal estimate: {currency(estimate.federal)}. Colorado estimate:{" "}
            {currency(estimate.colorado)}. Edit these if her actual paystub
            uses different percentages.
          </p>
        </article>

        <article className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <h3 className="font-bold">Planning Rule</h3>
          <p className="mt-2">
            Compare this estimate with the first real paystub, then update the
            percentages so future estimates feel close enough for budgeting.
          </p>
        </article>
      </div>
    </section>
  );
}
