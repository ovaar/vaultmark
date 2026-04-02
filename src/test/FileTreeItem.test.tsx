import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileTreeItem } from "../components/files/FileTreeItem";
import { useFileStore } from "../stores/fileStore";
import { setDragPath } from "../components/files/dragState";
import type { FileEntry } from "../types/file";

vi.mock("../stores/editorStore", () => {
  const openFile = vi.fn();
  return {
    useEditorStore: vi.fn((selector: (s: { openFile: typeof openFile }) => unknown) =>
      selector({ openFile })
    ),
  };
});

function makeEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: "readme.md",
    path: "readme.md",
    is_dir: false,
    extension: ".md",
    size: 100,
    modified: null,
    children: null,
    ...overrides,
  };
}

function makeFolder(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    name: "Notes",
    path: "Notes",
    is_dir: true,
    extension: null,
    size: null,
    modified: null,
    children: [],
    ...overrides,
  };
}

const mockMoveEntry = vi.fn();

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

describe("FileTreeItem drag-and-drop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDragPath(null);
    useFileStore.setState({
      vaultRoot: "/vault",
      fileTree: [],
      selectedFile: null,
      loading: false,
      error: null,
    });
    // Patch moveEntry on the store
    mockMoveEntry.mockResolvedValue(undefined);
    useFileStore.setState({ moveEntry: mockMoveEntry });
  });

  // ===== Valid drops =====

  it("allows dropping a file into a folder", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("readme.md");
    const dt = createDataTransfer({ "text/plain": "readme.md" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).toHaveBeenCalledWith("readme.md", "Notes");
  });

  it("allows dropping a folder into another folder", () => {
    const targetFolder = makeFolder({ name: "Docs", path: "Docs" });
    render(<FileTreeItem entry={targetFolder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes");
    const dt = createDataTransfer({ "text/plain": "Notes" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).toHaveBeenCalledWith("Notes", "Docs");
  });

  it("allows dropping a nested file into a different folder", () => {
    const targetFolder = makeFolder({ name: "Archive", path: "Archive" });
    render(<FileTreeItem entry={targetFolder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes/subdir/file.md");
    const dt = createDataTransfer({ "text/plain": "Notes/subdir/file.md" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).toHaveBeenCalledWith("Notes/subdir/file.md", "Archive");
  });

  // ===== Invalid drops =====

  it("rejects dropping a file onto itself", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes");
    const dt = createDataTransfer({ "text/plain": "Notes" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  it("rejects dropping a folder into its own descendant", () => {
    const childFolder = makeFolder({ name: "child", path: "Notes/child" });
    render(<FileTreeItem entry={childFolder} depth={1} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes");
    const dt = createDataTransfer({ "text/plain": "Notes" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  it("rejects dropping into the same parent folder (no-op)", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes/file.md");
    const dt = createDataTransfer({ "text/plain": "Notes/file.md" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  it("rejects dropping onto a file (non-directory)", () => {
    const file = makeEntry({ name: "readme.md", path: "readme.md" });
    render(<FileTreeItem entry={file} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("other.md");
    const dt = createDataTransfer({ "text/plain": "other.md" });

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  it("rejects drop when dataTransfer is empty", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    const dt = createDataTransfer({});

    fireEvent.drop(wrapper, { dataTransfer: dt });

    expect(mockMoveEntry).not.toHaveBeenCalled();
  });

  // ===== Visual feedback =====

  it("shows drag-over class when dragging a valid item over a folder", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("readme.md");
    const dt = createDataTransfer({ "text/plain": "readme.md" });

    fireEvent.dragEnter(wrapper, { dataTransfer: dt });

    expect(item).toHaveClass("drag-over");
    expect(item).not.toHaveClass("drag-invalid");
  });

  it("shows drag-invalid class when dragging over an invalid target", () => {
    const file = makeEntry({ name: "readme.md", path: "readme.md" });
    render(<FileTreeItem entry={file} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("other.md");
    const dt = createDataTransfer({ "text/plain": "other.md" });

    fireEvent.dragEnter(wrapper, { dataTransfer: dt });

    expect(item).toHaveClass("drag-invalid");
    expect(item).not.toHaveClass("drag-over");
  });

  it("shows drag-invalid when dragging a folder over its own child", () => {
    const childFolder = makeFolder({ name: "child", path: "Notes/child" });
    render(<FileTreeItem entry={childFolder} depth={1} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("Notes");
    const dt = createDataTransfer({ "text/plain": "Notes" });

    fireEvent.dragEnter(wrapper, { dataTransfer: dt });

    expect(item).toHaveClass("drag-invalid");
    expect(item).not.toHaveClass("drag-over");
  });

  it("clears drag classes on drag leave", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("readme.md");
    const dt = createDataTransfer({ "text/plain": "readme.md" });

    fireEvent.dragEnter(wrapper, { dataTransfer: dt });
    expect(item).toHaveClass("drag-over");

    fireEvent.dragLeave(wrapper, { dataTransfer: dt });
    expect(item).not.toHaveClass("drag-over");
    expect(item).not.toHaveClass("drag-invalid");
  });

  it("clears drag classes after drop", () => {
    const folder = makeFolder({ name: "Notes", path: "Notes" });
    render(<FileTreeItem entry={folder} depth={0} />);

    const item = screen.getByRole("treeitem");
    const wrapper = item.parentElement!;

    setDragPath("readme.md");
    const dt = createDataTransfer({ "text/plain": "readme.md" });

    fireEvent.dragEnter(wrapper, { dataTransfer: dt });
    expect(item).toHaveClass("drag-over");

    fireEvent.drop(wrapper, { dataTransfer: dt });
    expect(item).not.toHaveClass("drag-over");
    expect(item).not.toHaveClass("drag-invalid");
  });

  // ===== Drag start/end =====

  it("sets drag path on drag start and clears on drag end", async () => {
    const file = makeEntry({ name: "file.md", path: "file.md" });
    render(<FileTreeItem entry={file} depth={0} />);

    const item = screen.getByRole("treeitem");
    const dt = createDataTransfer();

    fireEvent.dragStart(item, { dataTransfer: dt });
    const { getDragPath } = await import("../components/files/dragState");
    expect(getDragPath()).toBe("file.md");

    fireEvent.dragEnd(item, { dataTransfer: dt });
    expect(getDragPath()).toBeNull();
  });
});
