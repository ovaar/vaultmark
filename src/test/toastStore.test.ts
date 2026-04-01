import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useToastStore } from "../stores/toastStore";

describe("toastStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store state
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with empty toasts", () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it("adds a toast with default type", () => {
    useToastStore.getState().addToast("Hello");
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("Hello");
    expect(toasts[0].type).toBe("info");
  });

  it("adds a toast with specified type", () => {
    useToastStore.getState().addToast("Success!", "success");
    const toasts = useToastStore.getState().toasts;
    expect(toasts[0].type).toBe("success");
  });

  it("removes a toast by id", () => {
    useToastStore.getState().addToast("msg1");
    useToastStore.getState().addToast("msg2");
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe("msg2");
  });

  it("auto-removes toast after 4 seconds", () => {
    useToastStore.getState().addToast("ephemeral");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("assigns unique ids to each toast", () => {
    useToastStore.getState().addToast("a");
    useToastStore.getState().addToast("b");
    const [a, b] = useToastStore.getState().toasts;
    expect(a.id).not.toBe(b.id);
  });
});
