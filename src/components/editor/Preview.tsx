import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { useEditorStore } from "../../stores/editorStore";

// Extend default sanitize schema to allow SVG elements for reMarkable stroke rendering
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "svg",
    "rect",
    "polyline",
    "line",
    "circle",
    "ellipse",
    "path",
    "g",
    "text",
    "tspan",
    "defs",
    "use",
    "clipPath",
  ],
  attributes: {
    ...defaultSchema.attributes,
    svg: [
      "xmlns",
      "viewBox",
      "width",
      "height",
      "fill",
      "stroke",
      "class",
      "style",
    ],
    rect: [
      "x",
      "y",
      "width",
      "height",
      "fill",
      "stroke",
      "strokeWidth",
      "rx",
      "ry",
    ],
    polyline: [
      "points",
      "fill",
      "stroke",
      "strokeWidth",
      "stroke-width",
      "strokeOpacity",
      "stroke-opacity",
      "strokeLinecap",
      "stroke-linecap",
      "strokeLinejoin",
      "stroke-linejoin",
    ],
    line: ["x1", "y1", "x2", "y2", "stroke", "strokeWidth", "stroke-width"],
    circle: ["cx", "cy", "r", "fill", "stroke"],
    ellipse: ["cx", "cy", "rx", "ry", "fill", "stroke"],
    path: ["d", "fill", "stroke", "strokeWidth", "stroke-width"],
    g: ["transform", "fill", "stroke", "opacity"],
    text: ["x", "y", "fontSize", "font-size", "fill", "textAnchor", "text-anchor"],
    tspan: ["x", "y", "dx", "dy"],
  },
};

import { PdfViewer } from "./PdfViewer";

export function Preview({ groupId }: { groupId: string }) {
  const group = useEditorStore((s) => s.groups.find((g) => g.id === groupId));

  const activeFile = group?.activeFile ?? null;
  const currentFile = group?.openFiles.find((f) => f.path === activeFile);

  if (!currentFile) {
    return (
      <div className="preview-empty">
        <p>No file selected</p>
      </div>
    );
  }

  // PDF content is returned as a data URL
  if (currentFile.content.startsWith("data:application/pdf;base64,")) {
    return <PdfViewer dataUrl={currentFile.content} />;
  }

  return (
    <div className="preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {currentFile.content}
      </ReactMarkdown>
    </div>
  );
}
