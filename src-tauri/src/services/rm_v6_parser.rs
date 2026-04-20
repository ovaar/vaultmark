use std::io::{Cursor, Read};

use crate::errors::AppError;

const HEADER_V6: &[u8] = b"reMarkable .lines file, version=6          ";
const CANVAS_WIDTH: f32 = 1404.0;
const CANVAS_HEIGHT: f32 = 1872.0;

// Tag types for the tagged block format
const TAG_ID: u8 = 0xF;
const TAG_LENGTH4: u8 = 0xC;
const TAG_BYTE8: u8 = 0x8;
const TAG_BYTE4: u8 = 0x4;
const TAG_BYTE1: u8 = 0x1;

// Block types
const BLOCK_SCENE_LINE_ITEM: u8 = 0x05;
const BLOCK_ROOT_TEXT: u8 = 0x07;

// Scene item types
const ITEM_TYPE_LINE: u8 = 0x03;

// Point format sizes
const POINT_V2_SIZE: usize = 14; // 2*f32 + 2*u16 + 2*u8
const POINT_V1_SIZE: usize = 24; // 6*f32

#[derive(Debug, Clone)]
struct V6Point {
    x: f32,
    y: f32,
    width: u16,
}

#[derive(Debug, Clone)]
struct V6Line {
    tool: u32,
    color: u32,
    thickness_scale: f64,
    points: Vec<V6Point>,
}

#[derive(Debug, Clone)]
struct V6TextItem {
    text: String,
    format_code: Option<u8>,
}

/// Parsed result from a v6 .rm file.
#[derive(Debug, Clone)]
pub struct V6Scene {
    pub lines: Vec<V6Line>,
    pub text_items: Vec<V6TextItem>,
    pub paragraph_styles: Vec<(u8, u8)>, // (author_part1, style_code)
}

/// Check if data starts with the v6 header.
pub fn is_v6(data: &[u8]) -> bool {
    data.len() >= HEADER_V6.len() && &data[..HEADER_V6.len()] == HEADER_V6
}

/// Parse a v6 .rm file and return SVG markup.
pub fn rm_v6_to_svg(data: &[u8]) -> Result<String, AppError> {
    let scene = parse_v6(data)?;
    Ok(render_v6_svg(&scene))
}

/// Parse a v6 .rm file and extract text content.
pub fn rm_v6_to_text(data: &[u8]) -> Result<Option<String>, AppError> {
    let scene = parse_v6(data)?;
    Ok(extract_text(&scene))
}

fn parse_v6(data: &[u8]) -> Result<V6Scene, AppError> {
    if data.len() < HEADER_V6.len() {
        return Err(AppError::Remarkable("File too small for v6 .rm format".into()));
    }

    if &data[..HEADER_V6.len()] != HEADER_V6 {
        return Err(AppError::Remarkable("Invalid v6 .rm header".into()));
    }

    let mut cursor = Cursor::new(data);
    cursor.set_position(HEADER_V6.len() as u64);

    let mut scene = V6Scene {
        lines: Vec::new(),
        text_items: Vec::new(),
        paragraph_styles: Vec::new(),
    };

    // Read blocks until EOF
    loop {
        match read_block(&mut cursor, &mut scene) {
            Ok(true) => continue,
            Ok(false) => break,
            Err(e) => {
                // If we've already parsed some content, return what we have
                if !scene.lines.is_empty() || !scene.text_items.is_empty() {
                    eprintln!("v6 parser: partial parse, stopping at error: {}", e);
                    break;
                }
                return Err(e);
            }
        }
    }

    Ok(scene)
}

/// Read a single top-level block. Returns Ok(true) if a block was read,
/// Ok(false) if EOF, Err on parse error.
fn read_block(cursor: &mut Cursor<&[u8]>, scene: &mut V6Scene) -> Result<bool, AppError> {
    let block_length = match read_u32(cursor) {
        Ok(v) => v,
        Err(_) => return Ok(false), // EOF
    };

    let _unknown = read_u8(cursor)?;
    let min_version = read_u8(cursor)?;
    let current_version = read_u8(cursor)?;
    let block_type = read_u8(cursor)?;

    let block_start = cursor.position();
    let block_end = block_start + block_length as u64;

    match block_type {
        BLOCK_SCENE_LINE_ITEM => {
            if let Err(e) = parse_scene_line_item_block(cursor, current_version, scene) {
                eprintln!("v6 parser: error parsing line block: {}", e);
            }
        }
        BLOCK_ROOT_TEXT => {
            if let Err(e) = parse_root_text_block(cursor, scene) {
                eprintln!("v6 parser: error parsing text block: {}", e);
            }
        }
        _ => {
            // Skip unknown block types (SceneInfo, AuthorIds, SceneTree, etc.)
            let _ = min_version; // suppress warning
        }
    }

    // Ensure we're positioned at the end of the block
    if cursor.position() != block_end {
        cursor.set_position(block_end);
    }

    Ok(true)
}

// ── Scene Line Item Block ──

fn parse_scene_line_item_block(
    cursor: &mut Cursor<&[u8]>,
    block_version: u8,
    scene: &mut V6Scene,
) -> Result<(), AppError> {
    // parent_id (tag 1, ID)
    read_tagged_id(cursor, 1)?;
    // item_id (tag 2, ID)
    read_tagged_id(cursor, 2)?;
    // left_id (tag 3, ID)
    read_tagged_id(cursor, 3)?;
    // right_id (tag 4, ID)
    read_tagged_id(cursor, 4)?;
    // deleted_length (tag 5, Byte4)
    let deleted_length = read_tagged_u32(cursor, 5)?;

    if deleted_length > 0 {
        // This is a deleted item; skip
        return Ok(());
    }

    // Check for value subblock (tag 6)
    if !check_tag(cursor, 6, TAG_LENGTH4) {
        // No value, tombstone-like entry
        return Ok(());
    }

    // Read subblock (tag 6, Length4)
    read_tag(cursor, 6, TAG_LENGTH4)?;
    let subblock_length = read_u32(cursor)?;
    let subblock_start = cursor.position();
    let subblock_end = subblock_start + subblock_length as u64;

    // item_type (uint8)
    let item_type = read_u8(cursor)?;
    if item_type != ITEM_TYPE_LINE {
        // Not a line item (could be group or text marker); skip
        cursor.set_position(subblock_end);
        return Ok(());
    }

    // Parse line content
    let point_version = if block_version >= 2 { 2 } else { 1 };
    let line = parse_line(cursor, point_version)?;
    scene.lines.push(line);

    cursor.set_position(subblock_end);
    Ok(())
}

fn parse_line(cursor: &mut Cursor<&[u8]>, point_version: u8) -> Result<V6Line, AppError> {
    // tool (tag 1, Byte4)
    let tool = read_tagged_u32(cursor, 1)?;
    // color (tag 2, Byte4)
    let color = read_tagged_u32(cursor, 2)?;
    // thickness_scale (tag 3, Byte8 / double)
    let thickness_scale = read_tagged_f64(cursor, 3)?;
    // starting_length (tag 4, Byte4 / float)
    let _starting_length = read_tagged_f32(cursor, 4)?;

    // points subblock (tag 5, Length4)
    read_tag(cursor, 5, TAG_LENGTH4)?;
    let points_length = read_u32(cursor)?;
    let points_start = cursor.position();

    let point_size = if point_version == 2 {
        POINT_V2_SIZE
    } else {
        POINT_V1_SIZE
    };

    let num_points = if point_size > 0 {
        points_length as usize / point_size
    } else {
        0
    };

    let mut points = Vec::with_capacity(num_points);
    for _ in 0..num_points {
        let point = parse_point(cursor, point_version)?;
        points.push(point);
    }

    // Ensure we're at the end of the points subblock
    let points_end = points_start + points_length as u64;
    cursor.set_position(points_end);

    // Skip remaining optional fields (timestamp tag 6, move_id tag 7)
    // We don't need these for SVG rendering

    Ok(V6Line {
        tool,
        color,
        thickness_scale,
        points,
    })
}

fn parse_point(cursor: &mut Cursor<&[u8]>, version: u8) -> Result<V6Point, AppError> {
    let x = read_f32(cursor)?;
    let y = read_f32(cursor)?;

    if version == 1 {
        let _speed = read_f32(cursor)?;
        let _direction = read_f32(cursor)?;
        let width_raw = read_f32(cursor)?;
        let _pressure = read_f32(cursor)?;
        Ok(V6Point {
            x,
            y,
            width: (width_raw * 4.0).round() as u16,
        })
    } else {
        let _speed = read_u16(cursor)?;
        let width = read_u16(cursor)?;
        let _direction = read_u8(cursor)?;
        let _pressure = read_u8(cursor)?;
        Ok(V6Point { x, y, width })
    }
}

// ── Root Text Block ──

fn parse_root_text_block(
    cursor: &mut Cursor<&[u8]>,
    scene: &mut V6Scene,
) -> Result<(), AppError> {
    // block_id (tag 1, ID)
    read_tagged_id(cursor, 1)?;

    // Main content subblock (tag 2, Length4)
    read_tag(cursor, 2, TAG_LENGTH4)?;
    let outer_length = read_u32(cursor)?;
    let outer_start = cursor.position();
    let outer_end = outer_start + outer_length as u64;

    // Text items subblock (tag 1 → tag 1)
    read_tag(cursor, 1, TAG_LENGTH4)?;
    let _items_outer_len = read_u32(cursor)?;

    read_tag(cursor, 1, TAG_LENGTH4)?;
    let _items_inner_len = read_u32(cursor)?;

    let num_items = read_varuint(cursor)?;

    for _ in 0..num_items {
        match parse_text_item(cursor) {
            Ok(item) => scene.text_items.push(item),
            Err(e) => {
                eprintln!("v6 parser: error parsing text item: {}", e);
                break;
            }
        }
    }

    // Skip to end (formatting + position data)
    cursor.set_position(outer_end);

    // Read paragraph styles (subblock tag 3 has pos_x/pos_y)
    // Read width (tag 4)
    // We skip these since we just need the text content

    Ok(())
}

fn parse_text_item(cursor: &mut Cursor<&[u8]>) -> Result<V6TextItem, AppError> {
    // Each text item is in a subblock (tag 0, Length4)
    read_tag(cursor, 0, TAG_LENGTH4)?;
    let item_length = read_u32(cursor)?;
    let item_start = cursor.position();
    let item_end = item_start + item_length as u64;

    // item_id (tag 2, ID)
    read_tagged_id(cursor, 2)?;
    // left_id (tag 3, ID)
    read_tagged_id(cursor, 3)?;
    // right_id (tag 4, ID)
    read_tagged_id(cursor, 4)?;
    // deleted_length (tag 5, Byte4)
    let deleted_length = read_tagged_u32(cursor, 5)?;

    let mut text = String::new();
    let mut format_code = None;

    if deleted_length == 0 && check_tag(cursor, 6, TAG_LENGTH4) {
        // Value subblock (tag 6)
        read_tag(cursor, 6, TAG_LENGTH4)?;
        let val_length = read_u32(cursor)?;
        let val_start = cursor.position();
        let val_end = val_start + val_length as u64;

        // String: varuint length, bool is_ascii, then bytes
        let str_len = read_varuint(cursor)?;
        let _is_ascii = read_u8(cursor)?; // is_ascii flag
        if str_len > 0 {
            let mut buf = vec![0u8; str_len as usize];
            cursor
                .read_exact(&mut buf)
                .map_err(|e| AppError::Remarkable(format!("Failed to read text bytes: {}", e)))?;
            text = String::from_utf8_lossy(&buf).to_string();
        }

        // Check for optional format code (tag 2, Byte4)
        if cursor.position() < val_end && check_tag(cursor, 2, TAG_BYTE4) {
            read_tag(cursor, 2, TAG_BYTE4)?;
            format_code = Some(read_u32(cursor)? as u8);
        }

        cursor.set_position(val_end);
    }

    cursor.set_position(item_end);

    Ok(V6TextItem { text, format_code })
}

// ── SVG Rendering ──

fn render_v6_svg(scene: &V6Scene) -> String {
    let mut paths = String::new();

    for line in &scene.lines {
        // Skip erasers
        if is_eraser(line.tool) {
            continue;
        }

        if line.points.is_empty() {
            continue;
        }

        let color = pen_color_to_hex(line.color);
        let opacity = pen_opacity(line.tool);

        // Calculate stroke width from thickness_scale and average point width
        let avg_width: f32 = if line.points.is_empty() {
            1.0
        } else {
            let sum: f32 = line.points.iter().map(|p| p.width as f32 / 4.0).sum();
            sum / line.points.len() as f32
        };
        let stroke_width = (avg_width * line.thickness_scale as f32).max(0.5);

        let points: Vec<String> = line
            .points
            .iter()
            .map(|p| format!("{:.1},{:.1}", p.x, p.y))
            .collect();

        paths.push_str(&format!(
            r#"<polyline points="{}" fill="none" stroke="{}" stroke-width="{:.1}" stroke-opacity="{}" stroke-linecap="round" stroke-linejoin="round"/>"#,
            points.join(" "),
            color,
            stroke_width,
            opacity,
        ));
        paths.push('\n');
    }

    format!(
        r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">
<rect width="{w}" height="{h}" fill="#ffffff"/>
{paths}</svg>"##,
        w = CANVAS_WIDTH,
        h = CANVAS_HEIGHT,
        paths = paths.trim_end(),
    )
}

fn extract_text(scene: &V6Scene) -> Option<String> {
    if scene.text_items.is_empty() {
        return None;
    }

    // Include ALL non-empty text items — items with format_code are paragraph
    // break markers whose text is "\n". Filtering them out loses newlines.
    let text: String = scene
        .text_items
        .iter()
        .filter(|item| !item.text.is_empty())
        .map(|item| item.text.as_str())
        .collect();

    if text.is_empty() {
        None
    } else {
        // Replace any literal escaped "\n" (two chars: backslash + n) with
        // actual newlines, in case the reMarkable firmware stores them escaped.
        Some(text.replace("\\n", "\n"))
    }
}

// ── Color & Pen Helpers ──

fn pen_color_to_hex(color: u32) -> &'static str {
    match color {
        0 => "#000000", // BLACK
        1 => "#808080", // GRAY
        2 => "#ffffff", // WHITE
        3 => "#ffff00", // YELLOW
        4 => "#00ff00", // GREEN
        5 => "#ff80ab", // PINK
        6 => "#0000ff", // BLUE
        7 => "#ff0000", // RED
        8 => "#c0c0c0", // GRAY_OVERLAP
        9 => "#ffff00", // HIGHLIGHT (same as yellow)
        10 => "#00c800", // GREEN_2
        11 => "#00ffff", // CYAN
        12 => "#ff00ff", // MAGENTA
        13 => "#ffd700", // YELLOW_2
        _ => "#000000",
    }
}

fn pen_opacity(tool: u32) -> &'static str {
    match tool {
        5 | 18 => "0.35", // Highlighter
        3 | 16 => "0.7",  // Marker
        _ => "1",
    }
}

fn is_eraser(tool: u32) -> bool {
    tool == 6 || tool == 8
}

// ── Low-level Reading Helpers ──

fn read_u8(cursor: &mut Cursor<&[u8]>) -> Result<u8, AppError> {
    let mut buf = [0u8; 1];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("v6: failed to read u8: {}", e)))?;
    Ok(buf[0])
}

fn read_u16(cursor: &mut Cursor<&[u8]>) -> Result<u16, AppError> {
    let mut buf = [0u8; 2];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("v6: failed to read u16: {}", e)))?;
    Ok(u16::from_le_bytes(buf))
}

fn read_u32(cursor: &mut Cursor<&[u8]>) -> Result<u32, AppError> {
    let mut buf = [0u8; 4];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("v6: failed to read u32: {}", e)))?;
    Ok(u32::from_le_bytes(buf))
}

fn read_f32(cursor: &mut Cursor<&[u8]>) -> Result<f32, AppError> {
    let mut buf = [0u8; 4];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("v6: failed to read f32: {}", e)))?;
    Ok(f32::from_le_bytes(buf))
}

fn read_f64(cursor: &mut Cursor<&[u8]>) -> Result<f64, AppError> {
    let mut buf = [0u8; 8];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("v6: failed to read f64: {}", e)))?;
    Ok(f64::from_le_bytes(buf))
}

fn read_varuint(cursor: &mut Cursor<&[u8]>) -> Result<u64, AppError> {
    let mut shift = 0u32;
    let mut result: u64 = 0;
    loop {
        let byte = read_u8(cursor)?;
        result |= ((byte & 0x7F) as u64) << shift;
        shift += 7;
        if byte & 0x80 == 0 {
            break;
        }
        if shift >= 64 {
            return Err(AppError::Remarkable("v6: varuint overflow".into()));
        }
    }
    Ok(result)
}

fn read_crdt_id(cursor: &mut Cursor<&[u8]>) -> Result<(u8, u64), AppError> {
    let part1 = read_u8(cursor)?;
    let part2 = read_varuint(cursor)?;
    Ok((part1, part2))
}

/// Read a tag and verify it matches the expected index and type.
fn read_tag(cursor: &mut Cursor<&[u8]>, expected_index: u8, expected_type: u8) -> Result<(), AppError> {
    let x = read_varuint(cursor)?;
    let index = (x >> 4) as u8;
    let tag_type = (x & 0xF) as u8;

    if index != expected_index {
        return Err(AppError::Remarkable(format!(
            "v6: expected tag index {}, got {} at position {}",
            expected_index,
            index,
            cursor.position()
        )));
    }
    if tag_type != expected_type {
        return Err(AppError::Remarkable(format!(
            "v6: expected tag type 0x{:X}, got 0x{:X} at position {}",
            expected_type,
            tag_type,
            cursor.position()
        )));
    }
    Ok(())
}

/// Check if the next tag matches, without advancing the cursor.
fn check_tag(cursor: &mut Cursor<&[u8]>, expected_index: u8, expected_type: u8) -> bool {
    let pos = cursor.position();
    let result = (|| -> Result<bool, AppError> {
        let x = read_varuint(cursor)?;
        let index = (x >> 4) as u8;
        let tag_type = (x & 0xF) as u8;
        Ok(index == expected_index && tag_type == expected_type)
    })();
    cursor.set_position(pos);
    result.unwrap_or(false)
}

/// Read a tagged ID field (tag + CrdtId).
fn read_tagged_id(cursor: &mut Cursor<&[u8]>, index: u8) -> Result<(u8, u64), AppError> {
    read_tag(cursor, index, TAG_ID)?;
    read_crdt_id(cursor)
}

/// Read a tagged u32 field.
fn read_tagged_u32(cursor: &mut Cursor<&[u8]>, index: u8) -> Result<u32, AppError> {
    read_tag(cursor, index, TAG_BYTE4)?;
    read_u32(cursor)
}

/// Read a tagged f32 field.
fn read_tagged_f32(cursor: &mut Cursor<&[u8]>, index: u8) -> Result<f32, AppError> {
    read_tag(cursor, index, TAG_BYTE4)?;
    read_f32(cursor)
}

/// Read a tagged f64 field.
fn read_tagged_f64(cursor: &mut Cursor<&[u8]>, index: u8) -> Result<f64, AppError> {
    read_tag(cursor, index, TAG_BYTE8)?;
    read_f64(cursor)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── Test Helpers ──

    fn write_varuint(buf: &mut Vec<u8>, mut value: u64) {
        loop {
            let mut byte = (value & 0x7F) as u8;
            value >>= 7;
            if value > 0 {
                byte |= 0x80;
            }
            buf.push(byte);
            if value == 0 {
                break;
            }
        }
    }

    fn write_tag(buf: &mut Vec<u8>, index: u8, tag_type: u8) {
        let x = ((index as u64) << 4) | (tag_type as u64);
        write_varuint(buf, x);
    }

    fn write_crdt_id(buf: &mut Vec<u8>, part1: u8, part2: u64) {
        buf.push(part1);
        write_varuint(buf, part2);
    }

    fn write_tagged_id(buf: &mut Vec<u8>, index: u8, part1: u8, part2: u64) {
        write_tag(buf, index, TAG_ID);
        write_crdt_id(buf, part1, part2);
    }

    fn write_tagged_u32(buf: &mut Vec<u8>, index: u8, value: u32) {
        write_tag(buf, index, TAG_BYTE4);
        buf.extend_from_slice(&value.to_le_bytes());
    }

    fn write_tagged_f32(buf: &mut Vec<u8>, index: u8, value: f32) {
        write_tag(buf, index, TAG_BYTE4);
        buf.extend_from_slice(&value.to_le_bytes());
    }

    fn write_tagged_f64(buf: &mut Vec<u8>, index: u8, value: f64) {
        write_tag(buf, index, TAG_BYTE8);
        buf.extend_from_slice(&value.to_le_bytes());
    }

    fn write_subblock_header(buf: &mut Vec<u8>, index: u8, content: &[u8]) {
        write_tag(buf, index, TAG_LENGTH4);
        buf.extend_from_slice(&(content.len() as u32).to_le_bytes());
        buf.extend_from_slice(content);
    }

    /// Build raw points data for point format v2.
    fn build_points_v2(points: &[(f32, f32, u16)]) -> Vec<u8> {
        let mut data = Vec::new();
        for (x, y, width) in points {
            data.extend_from_slice(&x.to_le_bytes());
            data.extend_from_slice(&y.to_le_bytes());
            data.extend_from_slice(&100u16.to_le_bytes()); // speed
            data.extend_from_slice(&width.to_le_bytes()); // width
            data.push(128); // direction
            data.push(200); // pressure
        }
        data
    }

    /// Build a line value subblock (inside the item_type + line content).
    fn build_line_value(tool: u32, color: u32, thickness: f64, points: &[(f32, f32, u16)]) -> Vec<u8> {
        let mut content = Vec::new();

        // item_type = LINE (0x03)
        content.push(ITEM_TYPE_LINE);

        // tool (tag 1, Byte4)
        write_tagged_u32(&mut content, 1, tool);
        // color (tag 2, Byte4)
        write_tagged_u32(&mut content, 2, color);
        // thickness_scale (tag 3, Byte8)
        write_tagged_f64(&mut content, 3, thickness);
        // starting_length (tag 4, Byte4/float)
        write_tagged_f32(&mut content, 4, 0.0);

        // points subblock (tag 5, Length4)
        let points_data = build_points_v2(points);
        write_subblock_header(&mut content, 5, &points_data);

        // timestamp (tag 6, ID) - optional but commonly present
        write_tagged_id(&mut content, 6, 0, 1);

        content
    }

    /// Build a SceneLineItemBlock (block type 0x05).
    fn build_line_block(
        tool: u32,
        color: u32,
        thickness: f64,
        points: &[(f32, f32, u16)],
    ) -> Vec<u8> {
        let mut block_content = Vec::new();

        // parent_id, item_id, left_id, right_id (tags 1-4, ID)
        write_tagged_id(&mut block_content, 1, 0, 1); // parent_id
        write_tagged_id(&mut block_content, 2, 1, 1); // item_id
        write_tagged_id(&mut block_content, 3, 0, 0); // left_id
        write_tagged_id(&mut block_content, 4, 0, 0); // right_id

        // deleted_length (tag 5, Byte4)
        write_tagged_u32(&mut block_content, 5, 0);

        // Value subblock (tag 6, Length4)
        let value = build_line_value(tool, color, thickness, points);
        write_subblock_header(&mut block_content, 6, &value);

        // Wrap in top-level block
        let mut block = Vec::new();
        block.extend_from_slice(&(block_content.len() as u32).to_le_bytes()); // block_length
        block.push(0); // unknown
        block.push(2); // min_version
        block.push(2); // current_version
        block.push(BLOCK_SCENE_LINE_ITEM); // block_type
        block.extend_from_slice(&block_content);

        block
    }

    /// Build a complete v6 file with the given blocks.
    fn build_v6_file(blocks: &[Vec<u8>]) -> Vec<u8> {
        let mut data = Vec::new();
        data.extend_from_slice(HEADER_V6);
        for block in blocks {
            data.extend_from_slice(block);
        }
        data
    }

    /// Build a RootTextBlock (block type 0x07) with given text.
    fn build_text_block(text: &str) -> Vec<u8> {
        // Build text item
        let mut text_item = Vec::new();
        write_tagged_id(&mut text_item, 2, 1, 16); // item_id
        write_tagged_id(&mut text_item, 3, 0, 0); // left_id
        write_tagged_id(&mut text_item, 4, 0, 0); // right_id
        write_tagged_u32(&mut text_item, 5, 0);    // deleted_length

        // Value subblock with string
        let mut val_content = Vec::new();
        write_varuint(&mut val_content, text.len() as u64); // string_length
        val_content.push(1); // is_ascii
        val_content.extend_from_slice(text.as_bytes());
        write_subblock_header(&mut text_item, 6, &val_content);

        // Wrap text_item in subblock 0
        let mut text_items_sub = Vec::new();
        write_subblock_header(&mut text_items_sub, 0, &text_item);

        // items innermost: varuint count + text items
        let mut items_data = Vec::new();
        write_varuint(&mut items_data, 1); // num items
        items_data.extend_from_slice(&text_items_sub);

        // inner subblock (tag 1)
        let mut items_inner = Vec::new();
        write_subblock_header(&mut items_inner, 1, &items_data);

        // formatting subblock (tag 2) - empty
        let mut fmt_inner = Vec::new();
        write_varuint(&mut fmt_inner, 0); // num formats
        let mut fmt_outer = Vec::new();
        write_subblock_header(&mut fmt_outer, 1, &fmt_inner);

        // outer items content: subblock(1) for text + subblock(2) for formatting
        let mut items_outer_content = Vec::new();
        write_subblock_header(&mut items_outer_content, 1, &items_inner);
        write_subblock_header(&mut items_outer_content, 2, &fmt_outer);

        // Build outer subblock (tag 2)
        let mut block_content = Vec::new();
        write_tagged_id(&mut block_content, 1, 0, 0); // block_id
        write_subblock_header(&mut block_content, 2, &items_outer_content);

        // Position subblock (tag 3)
        let mut pos_content = Vec::new();
        pos_content.extend_from_slice(&(-468.0f64).to_le_bytes()); // pos_x
        pos_content.extend_from_slice(&234.0f64.to_le_bytes()); // pos_y
        write_subblock_header(&mut block_content, 3, &pos_content);

        // width (tag 4, float)
        write_tagged_f32(&mut block_content, 4, 936.0);

        // Wrap in top-level block
        let mut block = Vec::new();
        block.extend_from_slice(&(block_content.len() as u32).to_le_bytes());
        block.push(0); // unknown
        block.push(1); // min_version
        block.push(1); // current_version
        block.push(BLOCK_ROOT_TEXT);
        block.extend_from_slice(&block_content);

        block
    }

    /// Build a single text item (subblock 0) with optional format_code.
    fn build_text_item_raw(text: &str, item_id: u64, format_code: Option<u32>) -> Vec<u8> {
        let mut text_item = Vec::new();
        write_tagged_id(&mut text_item, 2, 1, item_id); // item_id
        write_tagged_id(&mut text_item, 3, 0, 0); // left_id
        write_tagged_id(&mut text_item, 4, 0, 0); // right_id
        write_tagged_u32(&mut text_item, 5, 0);    // deleted_length

        // Value subblock with string + optional format code
        let mut val_content = Vec::new();
        write_varuint(&mut val_content, text.len() as u64);
        val_content.push(1); // is_ascii
        val_content.extend_from_slice(text.as_bytes());
        if let Some(fc) = format_code {
            write_tagged_u32(&mut val_content, 2, fc);
        }
        write_subblock_header(&mut text_item, 6, &val_content);

        // Wrap in subblock 0
        let mut out = Vec::new();
        write_subblock_header(&mut out, 0, &text_item);
        out
    }

    /// Build a RootTextBlock with multiple text items (each with text + optional format_code).
    fn build_multi_text_block(items: &[(&str, Option<u32>)]) -> Vec<u8> {
        // Build individual text items
        let mut all_items = Vec::new();
        for (i, (text, fc)) in items.iter().enumerate() {
            let item_bytes = build_text_item_raw(text, (i + 1) as u64, *fc);
            all_items.extend_from_slice(&item_bytes);
        }

        // items innermost: varuint count + items
        let mut items_data = Vec::new();
        write_varuint(&mut items_data, items.len() as u64);
        items_data.extend_from_slice(&all_items);

        // inner subblock (tag 1)
        let mut items_inner = Vec::new();
        write_subblock_header(&mut items_inner, 1, &items_data);

        // formatting subblock (tag 2) - empty
        let mut fmt_inner = Vec::new();
        write_varuint(&mut fmt_inner, 0);
        let mut fmt_outer = Vec::new();
        write_subblock_header(&mut fmt_outer, 1, &fmt_inner);

        // outer items content
        let mut items_outer_content = Vec::new();
        write_subblock_header(&mut items_outer_content, 1, &items_inner);
        write_subblock_header(&mut items_outer_content, 2, &fmt_outer);

        // Build outer subblock (tag 2)
        let mut block_content = Vec::new();
        write_tagged_id(&mut block_content, 1, 0, 0);
        write_subblock_header(&mut block_content, 2, &items_outer_content);

        // Position subblock (tag 3)
        let mut pos_content = Vec::new();
        pos_content.extend_from_slice(&(-468.0f64).to_le_bytes());
        pos_content.extend_from_slice(&234.0f64.to_le_bytes());
        write_subblock_header(&mut block_content, 3, &pos_content);

        write_tagged_f32(&mut block_content, 4, 936.0);

        let mut block = Vec::new();
        block.extend_from_slice(&(block_content.len() as u32).to_le_bytes());
        block.push(0);
        block.push(1);
        block.push(1);
        block.push(BLOCK_ROOT_TEXT);
        block.extend_from_slice(&block_content);

        block
    }

    // ── Tests ──

    #[test]
    fn test_is_v6() {
        let data = build_v6_file(&[]);
        assert!(is_v6(&data));
    }

    #[test]
    fn test_is_v6_too_short() {
        assert!(!is_v6(b"too short"));
    }

    #[test]
    fn test_is_v6_wrong_header() {
        let mut data = vec![0u8; 50];
        data[..5].copy_from_slice(b"WRONG");
        assert!(!is_v6(&data));
    }

    #[test]
    fn test_v6_empty_file() {
        let data = build_v6_file(&[]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("<svg"));
        assert!(svg.contains("</svg>"));
        assert!(!svg.contains("<polyline"));
    }

    #[test]
    fn test_v6_single_black_stroke() {
        let block = build_line_block(
            2,   // BALLPOINT_1
            0,   // BLACK
            1.0, // thickness
            &[(100.0, 100.0, 8), (200.0, 200.0, 8), (300.0, 300.0, 8)],
        );
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("<polyline"));
        assert!(svg.contains("100.0,100.0"));
        assert!(svg.contains("200.0,200.0"));
        assert!(svg.contains("300.0,300.0"));
        assert!(svg.contains("stroke=\"#000000\""));
        assert!(svg.contains("stroke-opacity=\"1\""));
    }

    #[test]
    fn test_v6_gray_stroke() {
        let block = build_line_block(2, 1, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#808080\""));
    }

    #[test]
    fn test_v6_red_stroke() {
        let block = build_line_block(2, 7, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#ff0000\""));
    }

    #[test]
    fn test_v6_blue_stroke() {
        let block = build_line_block(4, 6, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#0000ff\""));
    }

    #[test]
    fn test_v6_yellow_stroke() {
        let block = build_line_block(2, 3, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#ffff00\""));
    }

    #[test]
    fn test_v6_green_stroke() {
        let block = build_line_block(2, 4, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#00ff00\""));
    }

    #[test]
    fn test_v6_pink_stroke() {
        let block = build_line_block(2, 5, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#ff80ab\""));
    }

    #[test]
    fn test_v6_white_stroke() {
        let block = build_line_block(2, 2, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#ffffff\""));
    }

    #[test]
    fn test_v6_cyan_stroke() {
        let block = build_line_block(2, 11, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#00ffff\""));
    }

    #[test]
    fn test_v6_magenta_stroke() {
        let block = build_line_block(2, 12, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke=\"#ff00ff\""));
    }

    #[test]
    fn test_v6_highlighter_opacity() {
        let block = build_line_block(
            5, // HIGHLIGHTER_1
            3, // YELLOW
            1.0,
            &[(10.0, 10.0, 20)],
        );
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke-opacity=\"0.35\""));
    }

    #[test]
    fn test_v6_highlighter_2_opacity() {
        let block = build_line_block(
            18, // HIGHLIGHTER_2
            3,
            1.0,
            &[(10.0, 10.0, 20)],
        );
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke-opacity=\"0.35\""));
    }

    #[test]
    fn test_v6_marker_opacity() {
        let block = build_line_block(
            3, // MARKER_1
            0,
            1.0,
            &[(10.0, 10.0, 8)],
        );
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("stroke-opacity=\"0.7\""));
    }

    #[test]
    fn test_v6_eraser_skipped() {
        let eraser = build_line_block(6, 0, 1.0, &[(10.0, 10.0, 8)]);
        let pen = build_line_block(2, 0, 1.0, &[(20.0, 20.0, 8)]);
        let data = build_v6_file(&[eraser, pen]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert_eq!(svg.matches("<polyline").count(), 1);
        assert!(svg.contains("20.0,20.0"));
        assert!(!svg.contains("10.0,10.0"));
    }

    #[test]
    fn test_v6_area_eraser_skipped() {
        let eraser = build_line_block(8, 0, 1.0, &[(10.0, 10.0, 8)]);
        let data = build_v6_file(&[eraser]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(!svg.contains("<polyline"));
    }

    #[test]
    fn test_v6_multiple_strokes() {
        let block1 = build_line_block(2, 0, 1.0, &[(10.0, 10.0, 4)]);
        let block2 = build_line_block(4, 7, 1.0, &[(20.0, 20.0, 4)]);
        let block3 = build_line_block(0, 6, 1.0, &[(30.0, 30.0, 4)]);
        let data = build_v6_file(&[block1, block2, block3]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert_eq!(svg.matches("<polyline").count(), 3);
    }

    #[test]
    fn test_v6_thickness_scales_width() {
        let block = build_line_block(2, 0, 3.0, &[(10.0, 10.0, 8), (20.0, 20.0, 8)]);
        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        // width=8, /4 = 2.0, * thickness 3.0 = 6.0
        assert!(svg.contains("stroke-width=\"6.0\""));
    }

    #[test]
    fn test_v6_canvas_dimensions() {
        let data = build_v6_file(&[]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("viewBox=\"0 0 1404 1872\""));
        assert!(svg.contains("width=\"1404\""));
        assert!(svg.contains("height=\"1872\""));
    }

    #[test]
    fn test_v6_deleted_line_skipped() {
        // Build a line block with deleted_length > 0
        let mut block_content = Vec::new();
        write_tagged_id(&mut block_content, 1, 0, 1);
        write_tagged_id(&mut block_content, 2, 1, 1);
        write_tagged_id(&mut block_content, 3, 0, 0);
        write_tagged_id(&mut block_content, 4, 0, 0);
        write_tagged_u32(&mut block_content, 5, 1); // deleted_length = 1

        let mut block = Vec::new();
        block.extend_from_slice(&(block_content.len() as u32).to_le_bytes());
        block.push(0);
        block.push(2);
        block.push(2);
        block.push(BLOCK_SCENE_LINE_ITEM);
        block.extend_from_slice(&block_content);

        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(!svg.contains("<polyline"));
    }

    #[test]
    fn test_v6_text_extraction() {
        let block = build_text_block("Hello world");
        let data = build_v6_file(&[block]);
        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(text, Some("Hello world".to_string()));
    }

    #[test]
    fn test_v6_no_text() {
        let block = build_line_block(2, 0, 1.0, &[(10.0, 10.0, 4)]);
        let data = build_v6_file(&[block]);
        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(text, None);
    }

    #[test]
    fn test_v6_text_with_strokes() {
        let line_block = build_line_block(2, 0, 1.0, &[(10.0, 10.0, 4)]);
        let text_block = build_text_block("Mixed content");
        let data = build_v6_file(&[line_block, text_block]);

        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("<polyline"));

        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(text, Some("Mixed content".to_string()));
    }

    #[test]
    fn test_v6_text_paragraph_break_with_format_code() {
        // Paragraph breaks in the reMarkable CRDT are text items containing "\n"
        // with a format_code for the paragraph style. These must be preserved.
        let block = build_multi_text_block(&[
            ("Hello", None),
            ("\n", Some(0)),  // paragraph break (plain style)
            ("World", None),
        ]);
        let data = build_v6_file(&[block]);
        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(text, Some("Hello\nWorld".to_string()));
    }

    #[test]
    fn test_v6_text_multiple_paragraphs() {
        let block = build_multi_text_block(&[
            ("First paragraph", None),
            ("\n", Some(0)),
            ("Second paragraph", None),
            ("\n", Some(1)),  // heading style
            ("Third paragraph", None),
        ]);
        let data = build_v6_file(&[block]);
        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(
            text,
            Some("First paragraph\nSecond paragraph\nThird paragraph".to_string())
        );
    }

    #[test]
    fn test_v6_text_literal_escaped_newlines() {
        // If the reMarkable stores newlines as literal "\n" (two chars: \ + n)
        let block = build_text_block("Hello\\nWorld");
        let data = build_v6_file(&[block]);
        let text = rm_v6_to_text(&data).unwrap();
        assert_eq!(text, Some("Hello\nWorld".to_string()));
    }

    #[test]
    fn test_v6_unknown_block_type_skipped() {
        // Build a block with an unknown type (0xFF)
        let content = vec![0u8; 10];
        let mut block = Vec::new();
        block.extend_from_slice(&(content.len() as u32).to_le_bytes());
        block.push(0);
        block.push(1);
        block.push(1);
        block.push(0xFF); // unknown block type
        block.extend_from_slice(&content);

        // Put a valid line block after it
        let line_block = build_line_block(2, 0, 1.0, &[(50.0, 50.0, 4)]);
        let data = build_v6_file(&[block, line_block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("<polyline"));
    }

    #[test]
    fn test_v6_invalid_header() {
        let result = rm_v6_to_svg(b"not a v6 file at all, or long enough either");
        assert!(result.is_err());
    }

    #[test]
    fn test_v6_too_small() {
        let result = rm_v6_to_svg(b"short");
        assert!(result.is_err());
    }

    #[test]
    fn test_varuint_roundtrip() {
        for &val in &[0u64, 1, 127, 128, 16383, 16384, 2097151, u64::MAX >> 1] {
            let mut buf = Vec::new();
            write_varuint(&mut buf, val);
            let mut cursor = Cursor::new(buf.as_slice());
            let result = read_varuint(&mut cursor).unwrap();
            assert_eq!(result, val, "varuint mismatch for {}", val);
        }
    }

    #[test]
    fn test_pen_color_to_hex_all_colors() {
        assert_eq!(pen_color_to_hex(0), "#000000");
        assert_eq!(pen_color_to_hex(1), "#808080");
        assert_eq!(pen_color_to_hex(2), "#ffffff");
        assert_eq!(pen_color_to_hex(3), "#ffff00");
        assert_eq!(pen_color_to_hex(4), "#00ff00");
        assert_eq!(pen_color_to_hex(5), "#ff80ab");
        assert_eq!(pen_color_to_hex(6), "#0000ff");
        assert_eq!(pen_color_to_hex(7), "#ff0000");
        assert_eq!(pen_color_to_hex(8), "#c0c0c0");
        assert_eq!(pen_color_to_hex(9), "#ffff00");
        assert_eq!(pen_color_to_hex(10), "#00c800");
        assert_eq!(pen_color_to_hex(11), "#00ffff");
        assert_eq!(pen_color_to_hex(12), "#ff00ff");
        assert_eq!(pen_color_to_hex(13), "#ffd700");
        assert_eq!(pen_color_to_hex(99), "#000000"); // unknown defaults to black
    }

    #[test]
    fn test_is_eraser_values() {
        assert!(is_eraser(6));
        assert!(is_eraser(8));
        assert!(!is_eraser(0));
        assert!(!is_eraser(2));
        assert!(!is_eraser(5));
    }

    #[test]
    fn test_pen_opacity_values() {
        assert_eq!(pen_opacity(5), "0.35");
        assert_eq!(pen_opacity(18), "0.35");
        assert_eq!(pen_opacity(3), "0.7");
        assert_eq!(pen_opacity(16), "0.7");
        assert_eq!(pen_opacity(2), "1");
        assert_eq!(pen_opacity(0), "1");
    }

    #[test]
    fn test_v6_point_v1_format() {
        // Build a line block with v1 point format (block version = 1)
        let mut block_content = Vec::new();
        write_tagged_id(&mut block_content, 1, 0, 1);
        write_tagged_id(&mut block_content, 2, 1, 1);
        write_tagged_id(&mut block_content, 3, 0, 0);
        write_tagged_id(&mut block_content, 4, 0, 0);
        write_tagged_u32(&mut block_content, 5, 0);

        // Build v1 line value
        let mut value = Vec::new();
        value.push(ITEM_TYPE_LINE);
        write_tagged_u32(&mut value, 1, 2); // tool: BALLPOINT_1
        write_tagged_u32(&mut value, 2, 0); // color: BLACK
        write_tagged_f64(&mut value, 3, 1.0); // thickness
        write_tagged_f32(&mut value, 4, 0.0); // starting_length

        // v1 points (24 bytes each): x, y, speed/4, dir*2pi/255, width/4, pressure/255
        let mut points_data = Vec::new();
        points_data.extend_from_slice(&150.0f32.to_le_bytes()); // x
        points_data.extend_from_slice(&250.0f32.to_le_bytes()); // y
        points_data.extend_from_slice(&25.0f32.to_le_bytes()); // speed/4
        points_data.extend_from_slice(&1.5f32.to_le_bytes()); // direction
        points_data.extend_from_slice(&2.0f32.to_le_bytes()); // width/4 → width=8
        points_data.extend_from_slice(&0.8f32.to_le_bytes()); // pressure/255

        write_subblock_header(&mut value, 5, &points_data);
        write_tagged_id(&mut value, 6, 0, 1); // timestamp

        write_subblock_header(&mut block_content, 6, &value);

        // Block with version=1 (min_version=1, current_version=1)
        let mut block = Vec::new();
        block.extend_from_slice(&(block_content.len() as u32).to_le_bytes());
        block.push(0);
        block.push(1); // min_version=1
        block.push(1); // current_version=1 → v1 points
        block.push(BLOCK_SCENE_LINE_ITEM);
        block.extend_from_slice(&block_content);

        let data = build_v6_file(&[block]);
        let svg = rm_v6_to_svg(&data).unwrap();
        assert!(svg.contains("150.0,250.0"));
        assert!(svg.contains("<polyline"));
    }
}
