#!/usr/bin/env node

import http from "node:http";

function parseArgs() {
  const options = {
    host: "127.0.0.1",
    sttPort: 8080,
    ttsPort: 8880,
    pronunciationPort: 8090,
    selfTest: false,
    json: false
  };

  process.argv.slice(2).forEach((arg, index, args) => {
    const [key, inlineValue] = arg.split("=", 2);
    const nextValue = inlineValue || args[index + 1];

    if (key === "--host" && nextValue) {
      options.host = nextValue;
    }

    if (key === "--stt-port" && nextValue) {
      options.sttPort = Number(nextValue);
    }

    if (key === "--tts-port" && nextValue) {
      options.ttsPort = Number(nextValue);
    }

    if (key === "--pronunciation-port" && nextValue) {
      options.pronunciationPort = Number(nextValue);
    }

    if (key === "--self-test") {
      options.selfTest = true;
      options.sttPort = 0;
      options.ttsPort = 0;
      options.pronunciationPort = 0;
    }

    if (key === "--json") {
      options.json = true;
    }
  });

  return options;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function createToneWav({ seconds = 0.35, frequency = 440, sampleRate = 16000 } = {}) {
  const samples = Math.floor(seconds * sampleRate);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let index = 0; index < samples; index += 1) {
    const amplitude = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.18;
    buffer.writeInt16LE(Math.round(amplitude * 32767), 44 + index * 2);
  }

  return buffer;
}

function createSttServer() {
  return http.createServer(async (request, response) => {
    if (request.method !== "POST" || !request.url?.startsWith("/inference")) {
      sendJson(response, 404, { error: "Use POST /inference" });
      return;
    }

    await readBody(request);
    sendJson(response, 200, {
      text: "I need to reschedule my appointment for Friday morning.",
      source: "learn-english-dev-runtime"
    });
  });
}

function createTtsServer() {
  const audio = createToneWav();

  return http.createServer(async (request, response) => {
    const url = request.url ?? "";

    if (request.method !== "POST" || !(url.startsWith("/audio/speech") || url.startsWith("/v1/audio/speech"))) {
      sendJson(response, 404, { error: "Use POST /audio/speech or /v1/audio/speech" });
      return;
    }

    await readBody(request);
    response.writeHead(200, {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "Content-Length": String(audio.byteLength)
    });
    response.end(audio);
  });
}

function createPronunciationServer() {
  return http.createServer(async (request, response) => {
    if (request.method !== "POST" || !request.url?.startsWith("/score-pronunciation")) {
      sendJson(response, 404, { error: "Use POST /score-pronunciation" });
      return;
    }

    await readBody(request);
    sendJson(response, 200, {
      score: 84,
      pronunciationScore: 82,
      fluencyScore: 86,
      alignmentScore: 84,
      feedbackZh: "开发 runtime 已返回合同格式。生产环境请替换为真实强制对齐或发音评分模型。",
      words: [
        { word: "reschedule", score: 82, issue: "word stress" },
        { word: "appointment", score: 86 }
      ],
      phonemeFocus: [
        {
          label: "Word stress",
          detail: "Keep the main stress clear in longer service words.",
          words: ["reschedule", "appointment"]
        }
      ]
    });
  });
}

function listen(server, host, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      resolve({
        host,
        port: typeof address === "object" && address ? address.port : port
      });
    });
  });
}

async function startServers(options) {
  const stt = createSttServer();
  const tts = createTtsServer();
  const pronunciation = createPronunciationServer();

  const [sttAddress, ttsAddress, pronunciationAddress] = await Promise.all([
    listen(stt, options.host, options.sttPort),
    listen(tts, options.host, options.ttsPort),
    listen(pronunciation, options.host, options.pronunciationPort)
  ]);

  return {
    servers: { stt, tts, pronunciation },
    endpoints: {
      stt: `http://${sttAddress.host}:${sttAddress.port}/inference`,
      tts: `http://${ttsAddress.host}:${ttsAddress.port}/v1/audio/speech`,
      pronunciation: `http://${pronunciationAddress.host}:${pronunciationAddress.port}/score-pronunciation`
    },
    env: {
      SPEECH_PROVIDER: "local-whisper",
      SPEECH_BASE_URL: `http://${sttAddress.host}:${sttAddress.port}`,
      SPEECH_ENDPOINT_PATH: "/inference",
      SPEECH_FILE_FIELD: "file",
      SPEECH_RESPONSE_TEXT_PATH: "text",
      TTS_PROVIDER: "local",
      TTS_BASE_URL: `http://${ttsAddress.host}:${ttsAddress.port}/v1`,
      TTS_MODEL: "learn-english-dev-tts",
      TTS_ENDPOINT_PATH: "/audio/speech",
      TTS_FORMAT: "wav",
      PRONUNCIATION_PROVIDER: "local",
      PRONUNCIATION_BASE_URL: `http://${pronunciationAddress.host}:${pronunciationAddress.port}`,
      PRONUNCIATION_ENDPOINT_PATH: "/score-pronunciation"
    }
  };
}

function closeServers(servers) {
  return Promise.all(
    Object.values(servers).map(
      (server) =>
        new Promise((resolve) => {
          server.close(resolve);
        })
    )
  );
}

async function runSelfTest(runtime) {
  const audioBlob = new Blob([createToneWav()], { type: "audio/wav" });
  const sttBody = new FormData();
  sttBody.set("file", audioBlob, "sample.wav");
  sttBody.set("response_format", "json");
  const sttResponse = await fetch(runtime.endpoints.stt, {
    method: "POST",
    body: sttBody
  });
  const stt = await sttResponse.json();

  const ttsResponse = await fetch(runtime.endpoints.tts, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "learn-english-dev-tts",
      input: "Could you please speak more slowly?",
      voice: "alloy",
      response_format: "wav"
    })
  });
  const ttsAudio = await ttsResponse.arrayBuffer();

  const pronunciationBody = new FormData();
  pronunciationBody.set("file", audioBlob, "sample.wav");
  pronunciationBody.set("reference_text", "Could you please speak more slowly?");
  pronunciationBody.set("transcript", stt.text);
  const pronunciationResponse = await fetch(runtime.endpoints.pronunciation, {
    method: "POST",
    body: pronunciationBody
  });
  const pronunciation = await pronunciationResponse.json();

  return {
    stt: sttResponse.ok && typeof stt.text === "string",
    tts: ttsResponse.ok && ttsAudio.byteLength > 44,
    pronunciation: pronunciationResponse.ok && typeof pronunciation.score === "number"
  };
}

function printRuntime(runtime) {
  console.log("Learn English local speech development runtime");
  console.log("");
  console.log("Endpoints:");
  Object.entries(runtime.endpoints).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  console.log("");
  console.log("Copy these env values into .env.local for local development:");
  Object.entries(runtime.env).forEach(([key, value]) => {
    console.log(`${key}=${value}`);
  });
  console.log("");
  console.log("Press Ctrl+C to stop.");
}

async function main() {
  const options = parseArgs();
  const runtime = await startServers(options);

  if (options.selfTest) {
    const checks = await runSelfTest(runtime);
    await closeServers(runtime.servers);

    const report = {
      ok: Object.values(checks).every(Boolean),
      endpoints: runtime.endpoints,
      checks
    };

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log("Learn English local speech development runtime self-test");
      console.log("");
      Object.entries(checks).forEach(([key, value]) => {
        console.log(`${value ? "OK" : "FAIL"} ${key}`);
      });
      console.log("");
      console.log(`Ready: ${report.ok ? "yes" : "no"}`);
    }

    if (!report.ok) {
      process.exitCode = 1;
    }

    return;
  }

  if (options.json) {
    console.log(JSON.stringify({ ok: true, endpoints: runtime.endpoints, env: runtime.env }, null, 2));
  } else {
    printRuntime(runtime);
  }

  const shutdown = async () => {
    await closeServers(runtime.servers);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
