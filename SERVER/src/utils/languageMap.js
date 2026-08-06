const languageMap = {
  cpp: {
    image: "gcc:latest",
    fileName: "main.cpp",
    compile: "g++ main.cpp -o main",
    run: "./main",
  },

  c: {
    image: "gcc:latest",
    fileName: "main.c",
    compile: "gcc main.c -o main",
    run: "./main",
  },

  python: {
    image: "python:3.12",
    fileName: "main.py",
    compile: "",
    run: "python main.py",
  },

  javascript: {
    image: "node:22",
    fileName: "main.js",
    compile: "",
    run: "node main.js",
  },


 java: {
  image: "eclipse-temurin:21",
  fileName: "Main.java",
  compile: "javac Main.java",
  run: "java Main",
},
};

module.exports = languageMap;