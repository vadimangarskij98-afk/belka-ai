import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface TestCase {
  name: string;
  status: "pass" | "fail" | "skip";
  duration?: number;
  error?: string;
}

interface TestResultsProps {
  title?: string;
  tests: TestCase[];
  totalDuration?: number;
}

export default function TestResultsBlock({ title, tests, totalDuration }: TestResultsProps) {
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  const passed = tests.filter(t => t.status === "pass").length;
  const failed = tests.filter(t => t.status === "fail").length;
  const skipped = tests.filter(t => t.status === "skip").length;

  const toggle = (idx: number) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden my-2">
      <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
        <span className="text-sm text-white/80 font-medium">{title || "Результаты тестов"}</span>
        <div className="flex items-center gap-3 text-xs">
          {passed > 0 && <span className="text-emerald-400">{passed} passed</span>}
          {failed > 0 && <span className="text-red-400">{failed} failed</span>}
          {skipped > 0 && <span className="text-yellow-400">{skipped} skipped</span>}
          {totalDuration !== undefined && (
            <span className="text-white/30 font-mono">{(totalDuration / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {tests.map((test, i) => (
          <div key={i}>
            <button
              onClick={() => test.error ? toggle(i) : undefined}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-white/5 transition-colors"
            >
              {test.status === "pass" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              {test.status === "fail" && <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
              {test.status === "skip" && <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
              <span className={`text-left ${test.status === "fail" ? "text-red-300" : "text-white/70"}`}>
                {test.name}
              </span>
              {test.duration !== undefined && (
                <span className="ml-auto text-xs text-white/30 font-mono">{test.duration}ms</span>
              )}
              {test.error && (
                expandedTests.has(i) ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />
              )}
            </button>
            {expandedTests.has(i) && test.error && (
              <pre className="px-3 pb-2 text-xs text-red-400/70 font-mono whitespace-pre-wrap ml-6">{test.error}</pre>
            )}
          </div>
        ))}
      </div>

      <div className="px-3 py-1.5 bg-white/5 border-t border-white/10">
        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
          <div className="h-full flex">
            <div className="bg-emerald-500 transition-all" style={{ width: `${(passed / tests.length) * 100}%` }} />
            <div className="bg-red-500 transition-all" style={{ width: `${(failed / tests.length) * 100}%` }} />
            <div className="bg-yellow-500 transition-all" style={{ width: `${(skipped / tests.length) * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
