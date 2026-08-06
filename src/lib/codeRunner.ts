import { ExecutionResult } from "../types";

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) =>
      typeof arg === "object"
        ? JSON.stringify(arg, null, 2)
        : String(arg)
    )
    .join(" ");
}

export async function runCodeInSandbox(
  code: string,
  language: string
): Promise<ExecutionResult> {

  const startTime = performance.now();
  const logs: string[] = [];

  const customConsole = {

    log: (...args: unknown[]) => {
      logs.push(formatArgs(args));
    },

    error: (...args: unknown[]) => {
      logs.push("[ERROR] " + formatArgs(args));
    },

    warn: (...args: unknown[]) => {
      logs.push("[WARN] " + formatArgs(args));
    },

    info: (...args: unknown[]) => {
      logs.push("[INFO] " + formatArgs(args));
    },

  };


  try {

    switch(language.toLowerCase()) {


      case "javascript":
      case "js": {

        const executeCode = new Function(
          "console",
          `
          return (async () => {
            "use strict";
            ${code}
          })();
          `
        );


        await executeCode(customConsole);


        return {

          output:
            logs.length > 0
              ? logs.join("\n")
              : "Program executed successfully.",

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };
      }



      case "typescript": {

        return {

          output:
            "TypeScript requires transpilation before execution.",

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }



      case "html": {

        return {

          output:
            "HTML preview should be rendered using a sandboxed iframe.",

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }



      case "css": {

        return {

          output:
            "CSS must be combined with HTML for preview.",

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }



      case "json": {

        JSON.parse(code);


        return {

          output:
            "Valid JSON.",

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }



      case "python":
      case "java":
      case "cpp":
      case "c":
      case "rust": {

        return {

          output:
`${language.toUpperCase()} execution requires backend sandbox.

Connect SyncSpace with:
- Docker Sandbox
- Judge0 API
- Piston API`,

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }



      default: {

        return {

          output: "",

          error:
            `Unsupported language: ${language}`,

          executionTimeMs:
            Math.round(performance.now() - startTime),

        };

      }

    }


  } catch(error) {

    return {

      output:
        logs.join("\n"),

      error:
        error instanceof Error
          ? error.message
          : "Unknown runtime error",

      executionTimeMs:
        Math.round(performance.now() - startTime),

    };

  }
}
