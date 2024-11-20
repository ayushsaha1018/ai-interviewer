"use client";

import { LoadingIcon } from "../lib/icons";
import { ChangeEvent, useState } from "react";
import useJobStore from "../store/useJobStore";
import { useRouter } from "next/navigation";

export default function Home() {
  const [formValues, setFormValues] = useState({
    jobRole: "",
    jobDesc: "",
  });
  const [isPending, setIsPending] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const { setJobState } = useJobStore();
  const router = useRouter();

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value.trim() });
  };

  const handleResumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0];
      setResumeFile(file);
    }
  };

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);

    try {
      if (!resumeFile) throw new Error("No resume selected");
      const resumeContent = "abcd";
      setJobState({
        jobRole: formValues.jobRole,
        jobDesc: formValues.jobDesc,
        resumeContent: resumeContent,
      });
      console.log({ ...formValues, resumeContent });
      router.push("/interview");
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-3xl w-full flex flex-col items-start">
      <h1 className="text-2xl">Let&apos;s start your AI Interview</h1>
      <form
        className="flex flex-col justify-start w-full mt-4 gap-4"
        onSubmit={handleFormSubmit}
      >
        <div className="flex flex-col w-full gap-0.5">
          <label htmlFor="jobRole">Job Role</label>
          <input
            type="text"
            className="inputBox"
            required
            name="jobRole"
            id="jobRole"
            placeholder="Enter Job Role"
            value={formValues.jobRole}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col w-full gap-0.5">
          <label htmlFor="jobDesc">Job Description</label>
          <textarea
            className="inputBox"
            required
            name="jobDesc"
            id="jobDesc"
            placeholder="Enter Job Description"
            value={formValues.jobDesc}
            onChange={handleChange}
          />
        </div>

        <div className="flex flex-col w-full gap-0.5">
          <label htmlFor="resume">Resume</label>
          <input
            className="inputBox"
            required
            type="file"
            name="resume"
            id="resume"
            placeholder="Select Resume"
            onChange={handleResumeChange}
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded-lg font-semibold text-white bg-[linear-gradient(97deg,#5036d6_1.51%,#664ee2_99.5%)] shadow-md hover:opacity-90 transition-all duration-300 max-w-56 mt-3 flex items-start justify-center"
          disabled={isPending}
          aria-label="Submit"
        >
          {isPending ? <LoadingIcon /> : null}
          Start
        </button>
      </form>
    </div>
  );
}
