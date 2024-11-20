"use client";

import clsx from "clsx";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { EnterIcon, LoadingIcon } from "@/lib/icons";
import { usePlayer } from "@/lib/usePlayer";
import { track } from "@vercel/analytics";
import { useMicVAD, utils } from "@ricky0123/vad-react";
import useJobStore from "../../store/useJobStore";
import { useRouter } from "next/navigation";

type Message = {
  role: "user" | "assistant";
  content: string;
  latency?: number;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimestampRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const player = usePlayer();
  const { jobRole, jobDesc, resumeContent } = useJobStore();
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const vad = useMicVAD({
    startOnLoad: true, // Disable VAD on initialization
    onSpeechStart: () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      lastSpeechTimestampRef.current = Date.now();
    },
    onSpeechEnd: (audio) => {
      silenceTimerRef.current = setTimeout(() => {
        if (!isPlaying) {
          player.stop();
          const wav = utils.encodeWAV(audio);
          const blob = new Blob([wav], { type: "audio/wav" });
          submit(blob);
          const isFirefox = navigator.userAgent.includes("Firefox");
          if (isFirefox) vad.pause();
        }
      }, 3000);
    },
    workletURL: "/vad.worklet.bundle.min.js",
    modelURL: "/silero_vad.onnx",
    positiveSpeechThreshold: 0.6,
    minSpeechFrames: 4,
    ortConfig(ort) {
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );

      ort.env.wasm = {
        wasmPaths: {
          "ort-wasm-simd-threaded.wasm": "/ort-wasm-simd-threaded.wasm",
          "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
          "ort-wasm.wasm": "/ort-wasm.wasm",
          "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
        },
        numThreads: isSafari ? 1 : 4,
      };
    },
  });

  const [messages, submit, isPending] = useActionState<
    Array<Message>,
    string | Blob
  >(async (prevMessages, data) => {
    if (!jobRole || !jobDesc || !resumeContent) {
      toast.error("Enter Job Details");
      router.push("/");
      return prevMessages;
    }

    if (isPlaying) {
      return prevMessages;
    }

    const formData = new FormData();

    if (typeof data === "string") {
      formData.append("input", data);
      track("Text input");
    } else {
      formData.append("input", data, "audio.wav");
      track("Speech input");
    }

    for (const message of prevMessages) {
      formData.append("message", JSON.stringify(message));
    }

    formData.append("jobRole", jobRole);
    formData.append("jobDesc", jobDesc);
    formData.append("resumeContent", resumeContent);

    const submittedAt = Date.now();

    const response = await fetch("/api", {
      method: "POST",
      body: formData,
    });

    const transcript = decodeURIComponent(
      response.headers.get("X-Transcript") || ""
    );
    const text = decodeURIComponent(response.headers.get("X-Response") || "");

    if (!response.ok || !transcript || !text || !response.body) {
      if (response.status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error((await response.text()) || "An error occurred.");
      }

      return prevMessages;
    }

    const latency = Date.now() - submittedAt;

    setIsPlaying(true);

    player.play(response.body, () => {
      setIsPlaying(false);
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (isFirefox) vad.start();
    });

    setInput(transcript);

    return [
      ...prevMessages,
      {
        role: "user",
        content: transcript,
      },
      {
        role: "assistant",
        content: text,
        latency,
      },
    ];
  }, []);

  const handleStart = async () => {
    setInterviewStarted(true);
    try {
      submit("start interview");
    } catch (error) {
      console.log(error);
      setInterviewStarted(false);
    }
  };

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(input);
  }

  return (
    <>
      <div className="pb-4 min-h-28" />

      <div className="w-full flex justify-center items-center gap-2">
        <form
          className="rounded-full bg-neutral-200/80 dark:bg-neutral-800/80 flex items-center w-full max-w-3xl border border-transparent hover:border-neutral-300 focus-within:border-neutral-400 hover:focus-within:border-neutral-400 dark:hover:border-neutral-700 dark:focus-within:border-neutral-600 dark:hover:focus-within:border-neutral-600"
          onSubmit={handleFormSubmit}
        >
          <input
            type="text"
            className="bg-transparent focus:outline-none p-4 w-full placeholder:text-neutral-600 dark:placeholder:text-neutral-400"
            required
            placeholder="Enter Your Response"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            ref={inputRef}
          />

          <button
            type="submit"
            className="p-4 text-neutral-700 hover:text-black dark:text-neutral-300 dark:hover:text-white"
            disabled={isPending}
            aria-label="Submit"
          >
            {isPending ? <LoadingIcon /> : <EnterIcon />}
          </button>
        </form>
        <button
          className="px-4 py-2 rounded-lg font-semibold text-white bg-[linear-gradient(97deg,#5036d6_1.51%,#664ee2_99.5%)] shadow-md hover:opacity-90 transition-all duration-300 flex items-center justify-center h-10"
          disabled={interviewStarted}
          onClick={handleStart}
        >
          Start
        </button>
      </div>

      <div className="text-neutral-400 dark:text-neutral-600 pt-4 text-center max-w-xl text-balance min-h-28 space-y-4">
        {messages.length > 0 && (
          <p>
            {messages.at(-1)?.content}
            <span className="text-xs font-mono text-neutral-300 dark:text-neutral-700">
              {" "}
              ({messages.at(-1)?.latency}ms)
            </span>
          </p>
        )}

        {messages.length === 0 && (
          <>
            <p>
              A fast, open-source interview voice assistant powered by{" "}
              <A href="https://groq.com">Groq</A>,{" "}
              <A href="https://cartesia.ai">Cartesia</A>,{" "}
              <A href="https://www.vad.ricky0123.com/">VAD</A>, and{" "}
              <A href="https://vercel.com">Vercel</A>.{" "}
              <A href="https://github.com/ai-ng/swift" target="_blank">
                Learn more
              </A>
              .
            </p>

            {vad.loading ? (
              <p>Loading speech detection...</p>
            ) : vad.errored ? (
              <p>Failed to load speech detection.</p>
            ) : (
              <p>
                Press start to start the interview and speak your responses.
              </p>
            )}
          </>
        )}
      </div>

      <div
        className={clsx(
          "absolute size-36 blur-3xl rounded-full bg-gradient-to-b from-red-200 to-red-400 dark:from-red-600 dark:to-red-800 -z-50 transition ease-in-out",
          {
            "opacity-0": vad.loading || vad.errored,
            "opacity-30": !vad.loading && !vad.errored && !vad.userSpeaking,
            "opacity-100 scale-110": vad.userSpeaking,
          }
        )}
      />
    </>
  );
}

function A(props: any) {
  return (
    <a
      {...props}
      className="text-neutral-500 dark:text-neutral-500 hover:underline font-medium"
    />
  );
}
