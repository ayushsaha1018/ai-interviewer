import { create } from "zustand";

interface JobState {
  jobRole: string;
  jobDesc: string;
  resumeContent: string;
  setJobState: (
    newState: Partial<Pick<JobState, "jobRole" | "jobDesc" | "resumeContent">>
  ) => void;
  reset: () => void;
}

const useJobStore = create<JobState>((set) => ({
  jobRole: "",
  jobDesc: "",
  resumeContent: "",

  setJobState: (newState) =>
    set((state) => ({
      ...state,
      ...newState,
    })),

  reset: () => set({ jobRole: "", jobDesc: "", resumeContent: "" }),
}));

export default useJobStore;
