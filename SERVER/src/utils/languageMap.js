// Language definitions shared by every execution provider.
//  - docker:   image + file name + compile/run commands (run inside a sandbox container)
//  - judge0:   how to find the language on a Judge0 instance (matched by name so it
//              keeps working across Judge0 versions); a fixed id can be forced with
//              the JUDGE0_LANG_<KEY> env var, e.g. JUDGE0_LANG_PYTHON=92
// Commands are trusted constants (never built from user input).

const img = (key, fallback) => process.env[`EXEC_IMAGE_${key}`] || fallback;

const languageMap = {
  cpp: {
    label: "C++",
    image: img("CPP", "gcc:13"),
    fileName: "main.cpp",
    compile: "g++ -O2 -std=c++17 -pipe -o main main.cpp",
    run: "./main",
    judge0: { match: /^C\+\+ \(GCC/i, fallbackId: 54 },
  },

  c: {
    label: "C",
    image: img("C", "gcc:13"),
    fileName: "main.c",
    // -lm: without it any program using math.h functions fails to link
    compile: "gcc -O2 -std=c17 -pipe -o main main.c -lm",
    run: "./main",
    judge0: { match: /^C \(GCC/i, fallbackId: 50 },
  },

  python: {
    label: "Python",
    image: img("PYTHON", "python:3.12-slim"),
    fileName: "main.py",
    compile: "",
    run: "python -B main.py",
    judge0: { match: /^Python \(3\./i, fallbackId: 71 },
  },

  javascript: {
    label: "JavaScript",
    image: img("JAVASCRIPT", "node:22-slim"),
    fileName: "main.js",
    compile: "",
    run: "node main.js",
    judge0: { match: /^JavaScript \(Node\.js/i, fallbackId: 63 },
  },

  java: {
    label: "Java",
    image: img("JAVA", "eclipse-temurin:21-jdk"),
    fileName: "Main.java",
    compile: "javac -J-Xmx256m -encoding UTF-8 Main.java",
    run: "java -Xmx256m -Xss64m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -XX:-UsePerfData -Xshare:auto Main",
    memoryMb: 512,
    pids: 256,
    judge0: { match: /^Java \((OpenJDK|JDK)/i, fallbackId: 62 },
  },
};

module.exports = languageMap;
