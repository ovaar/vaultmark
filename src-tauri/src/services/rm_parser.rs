use std::io::{Cursor, Read};

use crate::errors::AppError;

const RM_HEADER_V3: &str = "reMarkable .lines file, version=3";
const RM_HEADER_V5: &str = "reMarkable .lines file, version=5";
const HEADER_LEN: usize = 43;
const CANVAS_WIDTH: f32 = 1404.0;
const CANVAS_HEIGHT: f32 = 1872.0;

#[derive(Debug, Clone, Copy)]
struct Segment {
    x: f32,
    y: f32,
    width: f32,
}

#[derive(Debug, Clone)]
struct Stroke {
    pen: i32,
    color: i32,
    brush_size: f32,
    segments: Vec<Segment>,
}

#[derive(Debug, Clone)]
struct Layer {
    strokes: Vec<Stroke>,
}

/// Parse a .rm binary file (v3 or v5) and convert to SVG markup.
pub fn rm_to_svg(data: &[u8]) -> Result<String, AppError> {
    let layers = parse_rm(data)?;
    Ok(render_svg(&layers))
}

fn parse_rm(data: &[u8]) -> Result<Vec<Layer>, AppError> {
    if data.len() < HEADER_LEN + 4 {
        return Err(AppError::Remarkable("File too small to be a valid .rm file".into()));
    }

    let header = std::str::from_utf8(&data[..HEADER_LEN])
        .map_err(|_| AppError::Remarkable("Invalid .rm header encoding".into()))?;

    let version = if header.starts_with(RM_HEADER_V5) {
        5
    } else if header.starts_with(RM_HEADER_V3) {
        3
    } else {
        return Err(AppError::Remarkable(format!(
            "Unsupported .rm version: {}",
            header.trim()
        )));
    };

    let mut cursor = Cursor::new(&data[HEADER_LEN..]);

    let num_layers = read_i32(&mut cursor)?;
    let mut layers = Vec::with_capacity(num_layers as usize);

    for _ in 0..num_layers {
        let num_strokes = read_i32(&mut cursor)?;
        let mut strokes = Vec::with_capacity(num_strokes as usize);

        for _ in 0..num_strokes {
            let pen = read_i32(&mut cursor)?;
            let color = read_i32(&mut cursor)?;
            let _padding = read_i32(&mut cursor)?;
            let brush_size = read_f32(&mut cursor)?;

            // v5 has an extra unknown float in the stroke header
            if version >= 5 {
                let _unknown = read_f32(&mut cursor)?;
            }

            let num_segments = read_i32(&mut cursor)?;
            let mut segments = Vec::with_capacity(num_segments as usize);

            for _ in 0..num_segments {
                let x = read_f32(&mut cursor)?;
                let y = read_f32(&mut cursor)?;
                let _speed = read_f32(&mut cursor)?;
                let _direction = read_f32(&mut cursor)?;
                let width = read_f32(&mut cursor)?;
                let _pressure = read_f32(&mut cursor)?;

                segments.push(Segment { x, y, width });
            }

            strokes.push(Stroke {
                pen,
                color,
                brush_size,
                segments,
            });
        }

        layers.push(Layer { strokes });
    }

    Ok(layers)
}

fn render_svg(layers: &[Layer]) -> String {
    let mut paths = String::new();

    for layer in layers {
        for stroke in &layer.strokes {
            // Skip erasers (pen types 8 and 9)
            if stroke.pen == 8 || stroke.pen == 9 {
                continue;
            }

            if stroke.segments.is_empty() {
                continue;
            }

            let color = match stroke.color {
                0 => "#000000",
                1 => "#808080",
                2 => "#ffffff",
                _ => "#000000",
            };

            let opacity = match stroke.pen {
                // Highlighter
                7 => "0.35",
                // Marker
                2 => "0.7",
                _ => "1",
            };

            // Average width from segments, scaled by brush size
            let avg_width: f32 = if stroke.segments.is_empty() {
                stroke.brush_size
            } else {
                let sum: f32 = stroke.segments.iter().map(|s| s.width).sum();
                sum / stroke.segments.len() as f32
            };
            let stroke_width = avg_width.max(0.5);

            // Build SVG polyline from segments
            let points: Vec<String> = stroke
                .segments
                .iter()
                .map(|s| format!("{:.1},{:.1}", s.x, s.y))
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

fn read_i32(cursor: &mut Cursor<&[u8]>) -> Result<i32, AppError> {
    let mut buf = [0u8; 4];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("Failed to read i32: {}", e)))?;
    Ok(i32::from_le_bytes(buf))
}

fn read_f32(cursor: &mut Cursor<&[u8]>) -> Result<f32, AppError> {
    let mut buf = [0u8; 4];
    cursor
        .read_exact(&mut buf)
        .map_err(|e| AppError::Remarkable(format!("Failed to read f32: {}", e)))?;
    Ok(f32::from_le_bytes(buf))
}
