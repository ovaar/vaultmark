import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useFileStore } from "../stores/fileStore";
import { setDragPath } from "../components/files/dragState";

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

vi.mock("../stores/editorStore", () => {
  const openFile = vi.fn();
  return {
    useEditorStore: vi.fn((selector: (s: { openFile: typeof openFile }) => unknown) =>
      selector({ openFile })
    ),
  };
});

function createDataTransfer(data: Record<string, string> = {}) {
  const store: Record<string, string> = { ...data };
  return {
    setData: (key: string, value: string) => { store[key] = value; },
    getData: (key: string) => store[key] ?? "",
    effectAllowed: "uninitialized" as string,
    dropEffect: "none" as string,
    types: Object.keys(store),
  };
}

const mockMoveEntry = vi.fn();

// Dynamic import to ensure mocks are set up first
async function renderFileTree() {
  const { FileTree } = await import("../components/files/FileTree");
  return render(<FileTree />);
}

describe("FileTree root-level drag-and-drop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDragPath(null);
    mockMoveEntry.mockResolvedValue(undefined);
    useFileStore.setState({
      vaultRoot: "/vault",
      fileTree: [
        {
          name: "Notes",
          path: "Notes",
          is_dir: true,
          extension: null,
          size: null,
          modified: null,
          children: [
            {
              name: "nested.md",
              path: "Notes/nested.md",
              is_dir: false,
              extension: ".md",
              size: 50,
              modified: null,
              children: null,
            },
          ],
        },
        {
          name: "root-file.md",
          path: "root-file.md",
          is_dir: false,
          extension: ".md",
          size: 100,
          modified: null,
          children: null,
        },
      ],
      selectedFile: null,
      loading: false,
      error: null,
      moveEntry: mockMoveEntry,
    });
  });

  it("allows dropping a nested item onto root area", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("Notes/nested.md");
    const dt = createDataTransfer({ "text/plain": "Notes/nested.md" });

    fireEvent.drop(tree, { dataTransfer: dt });

    expect(mockMoveEntry).toHaveBeenCalledWith("Notes/nested.md", "");
  });

  it("rejects dropping a root-level item onto root area", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("root-file.md");
    const dt = createDataTransfer({ "text/plain": "root-file.md" });

    fireEvent.drop(tree, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  it("shows root-drag-over class for valid root drop", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("Notes/nested.md");
    const dt = createDataTransfer({ "text/plain": "Notes/nested.md" });

    fireEvent.dragEnter(tree, { dataTransfer: dt });

    expect(tree).toHaveClass("root-drag-over");
    expect(tree).not.toHaveClass("root-drag-invalid");
  });

  it("shows root-drag-invalid class for invalid root drop", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("root-file.md");
    const dt = createDataTransfer({ "text/plain": "root-file.md" });

    fireEvent.dragEnter(tree, { dataTransfer: dt });

    expect(tree).toHaveClass("root-drag-invalid");
    expect(tree).not.toHaveClass("root-drag-over");
  });

  it("clears root drag classes on drag leave", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("Notes/nested.md");
    const dt = createDataTransfer({ "text/plain": "Notes/nested.md" });

    fireEvent.dragEnter(tree, { dataTransfer: dt });
    expect(tree).toHaveClass("root-drag-over");

    fireEvent.dragLeave(tree, { dataTransfer: dt });
    expect(tree).not.toHaveClass("root-drag-over");
    expect(tree).not.toHaveClass("root-drag-invalid");
  });

  it("clears root drag classes after drop", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    setDragPath("Notes/nested.md");
    const dt = createDataTransfer({ "text/plain": "Notes/nested.md" });

    fireEvent.dragEnter(tree, { dataTransfer: dt });
    fireEvent.drop(tree, { dataTransfer: dt });

    expect(tree).not.toHaveClass("root-drag-over");
    expect(tree).not.toHaveClass("root-drag-invalid");
  });

  it("rejects drop when dataTransfer is empty", async () => {
    await renderFileTree();
    const tree = screen.getByRole("tree");

    const dt = createDataTransfer({});

    fireEvent.drop(tree, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });
});
