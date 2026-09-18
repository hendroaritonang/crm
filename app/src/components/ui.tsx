import { ReactNode } from "react";
import clsx from "clsx";

/* ---------- Card ---------- */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Buttons ---------- */
type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md";
};

export function Btn({ variant = "secondary", size = "md", className, ...props }: BtnProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
        variant === "success" && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
        variant === "ghost" && "text-sky-700 hover:bg-sky-50",
        className
      )}
      {...props}
    />
  );
}

export function LinkBtn({
  href,
  variant = "secondary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: BtnProps["variant"];
  size?: BtnProps["size"];
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        variant === "primary" && "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
        variant === "success" && "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        variant === "danger" && "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50",
        variant === "ghost" && "text-sky-700 hover:bg-sky-50",
        className
      )}
    >
      {children}
    </a>
  );
}

/* ---------- Form ---------- */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={clsx("block text-xs font-medium text-slate-600", className)}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(inputCls, props.className)} />;
}

/* ---------- Badge status ---------- */
const STATUS_COLORS: Record<string, string> = {
  aktif: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  online: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
  prospek: "bg-sky-50 text-sky-700 ring-sky-200",
  open: "bg-rose-50 text-rose-700 ring-rose-200",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  isolir: "bg-rose-50 text-rose-700 ring-rose-200",
  blocked: "bg-rose-50 text-rose-700 ring-rose-200",
  assigned: "bg-sky-50 text-sky-700 ring-sky-200",
  unpaid: "bg-amber-50 text-amber-700 ring-amber-200",
  reserved: "bg-amber-50 text-amber-700 ring-amber-200",
  progress: "bg-amber-50 text-amber-700 ring-amber-200",
  nonaktif: "bg-slate-100 text-slate-600 ring-slate-200",
  berhenti: "bg-slate-100 text-slate-600 ring-slate-200",
  mati: "bg-rose-50 text-rose-700 ring-rose-200",
  lambat: "bg-amber-50 text-amber-700 ring-amber-200",
  urgent: "bg-rose-50 text-rose-700 ring-rose-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
};

export function Badge({ value }: { value: string }) {
  const color = STATUS_COLORS[value.toLowerCase()] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", color)}>
      {value}
    </span>
  );
}

/* ---------- Page header ---------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Table ---------- */
export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={clsx("whitespace-nowrap bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx("border-t border-slate-100 px-4 py-2.5 align-middle", className)}>{children}</td>;
}

/* ---------- Empty / misc ---------- */
export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-sm text-slate-400">{text}</div>;
}

export function Stat({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm", accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </Card>
  );
}
