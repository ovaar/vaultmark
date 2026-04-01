import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastContainer } from "../components/layout/ToastContainer";
import { useToastStore } from "../stores/toastStore";

describe("ToastContainer", () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it("renders nothing when no toasts", () => {
    const { container } = render(<ToastContainer />);
    expect(container.innerHTML).toBe("");
  });

  it("renders toasts with correct messages", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", message: "Hello", type: "info" },
        { id: "2", message: "Done", type: "success" },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("renders correct icon for each type", () => {
    useToastStore.setState({
      toasts: [
        { id: "1", message: "info msg", type: "info" },
        { id: "2", message: "success msg", type: "success" },
        { id: "3", message: "error msg", type: "error" },
      ],
    });
    render(<ToastContainer />);
    expect(screen.getByText("ℹ")).toBeInTheDocument();
    expect(screen.getByText("✓")).toBeInTheDocument();
    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("removes toast on click", async () => {
    useToastStore.setState({
      toasts: [{ id: "t1", message: "Click me", type: "info" }],
    });
    render(<ToastContainer />);
    await userEvent.click(screen.getByText("Click me"));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
