export interface RunResult {
  output: string;
  error: string | null;
  passed: boolean;
}

export async function runJavaScript(
  code: string,
  input: string,
  expectedOutput: string
): Promise<RunResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({ output: "", error: "Time Limit Exceeded (5s)", passed: false });
    }, 5000);

    try {
      // Create a sandboxed function
      const wrappedCode = `
        "use strict";
        ${code}
      `;
      const fn = new Function("input", wrappedCode);
      const parsedInput = JSON.parse(input);
      const result = fn(parsedInput);
      clearTimeout(timeout);

      const output = JSON.stringify(result);
      const expected = expectedOutput.trim();
      const passed = output === expected;

      resolve({ output, error: null, passed });
    } catch (e: any) {
      clearTimeout(timeout);
      resolve({ output: "", error: e.message || "Runtime Error", passed: false });
    }
  });
}

export async function runTestCases(
  code: string,
  testCases: { input: string; expected_output: string; is_hidden: boolean }[],
  language: string
): Promise<{ results: RunResult[]; passed: number; total: number }> {
  const results: RunResult[] = [];

  for (const tc of testCases) {
    if (language === "javascript") {
      const result = await runJavaScript(code, tc.input, tc.expected_output);
      results.push(result);
    } else {
      // Python via Pyodide - lazy load
      results.push({
        output: "",
        error: "Python execution requires Pyodide (loading...)",
        passed: false,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  return { results, passed, total: testCases.length };
}
