use actix_cors::Cors;
use actix_multipart::Multipart;
use actix_web::{web, App, HttpResponse, HttpServer, Result};
use futures_util::TryStreamExt;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::process::Command;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
struct YouTubeRequest {
    url: String,
    format: String,
    quality: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct MetadataRequest {
    artist: Option<String>,
    title: Option<String>,
    album: Option<String>,
    genre: Option<String>,
}

#[derive(Debug, Serialize)]
struct ApiResponse {
    success: bool,
    message: String,
    file_id: Option<String>,
}

struct AppState {
    upload_dir: PathBuf,
    output_dir: PathBuf,
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "version": "0.1.0"
    }))
}

async fn convert_audio(
    mut payload: Multipart,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let mut format = String::from("mp3");
    let mut quality = None;
    let mut file_path: Option<PathBuf> = None;
    let file_id = Uuid::new_v4().to_string();
    let mut bitrate_mode = String::from("constant");
    let mut sample_rate = String::from("44100");
    let mut channels = String::from("2");
    let mut fade_in = false;
    let mut fade_out = false;
    let mut reverse = false;

    // Process multipart form data
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition
            .as_ref()
            .and_then(|cd| cd.get_name())
            .unwrap_or("")
            .to_string();
        let filename_opt = content_disposition
            .and_then(|cd| cd.get_filename())
            .map(|s| s.to_string());

        match field_name.as_str() {
            "file" => {
                let filename = filename_opt.unwrap_or_else(|| "upload".to_string());
                let filepath = data.upload_dir.join(format!("{}_{}", file_id, &filename));

                let mut f = web::block(move || std::fs::File::create(filepath.clone()))
                    .await?
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

                while let Ok(Some(chunk)) = field.try_next().await {
                    f = web::block(move || {
                        let mut file = f;
                        file.write_all(&chunk)?;
                        Ok::<_, std::io::Error>(file)
                    })
                    .await?
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
                }

                file_path = Some(data.upload_dir.join(format!("{}_{}", file_id, filename)));
            }
            "format" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                format = String::from_utf8(bytes).unwrap_or_else(|_| String::from("mp3"));
            }
            "quality" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                quality = Some(String::from_utf8(bytes).unwrap_or_else(|_| String::from("192")));
            }
            "bitrate_mode" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                bitrate_mode = String::from_utf8(bytes).unwrap_or_else(|_| String::from("constant"));
            }
            "sample_rate" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                sample_rate = String::from_utf8(bytes).unwrap_or_else(|_| String::from("44100"));
            }
            "channels" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                channels = String::from_utf8(bytes).unwrap_or_else(|_| String::from("2"));
            }
            "fade_in" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                fade_in = String::from_utf8(bytes).unwrap_or_else(|_| String::from("false")) == "true";
            }
            "fade_out" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                fade_out = String::from_utf8(bytes).unwrap_or_else(|_| String::from("false")) == "true";
            }
            "reverse" => {
                let mut bytes = Vec::new();
                while let Ok(Some(chunk)) = field.try_next().await {
                    bytes.extend_from_slice(&chunk);
                }
                reverse = String::from_utf8(bytes).unwrap_or_else(|_| String::from("false")) == "true";
            }
            _ => {}
        }
    }

    if let Some(input_path) = file_path {
        let output_filename = format!("{}.{}", file_id, format);
        let output_path = data.output_dir.join(&output_filename);

        // Build ffmpeg command
        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-i").arg(&input_path).arg("-y");

        // Build audio filter chain
        let mut filters = Vec::new();
        
        // Apply reverse if requested
        if reverse {
            filters.push("areverse".to_string());
        }
        
        // Apply fade in (3 seconds)
        if fade_in {
            filters.push("afade=t=in:ss=0:d=3".to_string());
        }
        
        // Apply fade out (3 seconds from end)
        if fade_out {
            filters.push("afade=t=out:st=-3:d=3".to_string());
        }

        // Apply filters if any exist
        if !filters.is_empty() {
            cmd.arg("-af").arg(filters.join(","));
        }

        // Set sample rate
        cmd.arg("-ar").arg(&sample_rate);

        // Set channels
        cmd.arg("-ac").arg(&channels);

        // Add quality settings based on format and bitrate mode
        if let Some(q) = quality {
            match format.as_str() {
                "mp3" => {
                    if bitrate_mode == "variable" {
                        // Use VBR quality scale (0-9, where 0 is best)
                        let vbr_quality = match q.parse::<i32>().unwrap_or(192) {
                            x if x >= 320 => 0,
                            x if x >= 256 => 1,
                            x if x >= 224 => 2,
                            x if x >= 192 => 3,
                            x if x >= 160 => 4,
                            x if x >= 128 => 5,
                            x if x >= 96 => 6,
                            x if x >= 80 => 7,
                            x if x >= 64 => 8,
                            _ => 9,
                        };
                        cmd.arg("-q:a").arg(format!("{}", vbr_quality));
                    } else {
                        cmd.arg("-b:a").arg(format!("{}k", q));
                    }
                }
                "ogg" | "opus" => {
                    cmd.arg("-b:a").arg(format!("{}k", q));
                }
                "aac" | "m4a" => {
                    cmd.arg("-b:a").arg(format!("{}k", q));
                }
                _ => {}
            }
        }

        cmd.arg(&output_path);

        let output = cmd.output().map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("FFmpeg error: {}", e))
        })?;

        if !output.status.success() {
            return Ok(HttpResponse::InternalServerError().json(ApiResponse {
                success: false,
                message: format!(
                    "Conversion failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                ),
                file_id: None,
            }));
        }

        // Clean up input file
        if let Err(e) = fs::remove_file(&input_path) {
            eprintln!("Warning: Failed to clean up input file: {}", e);
        }

        Ok(HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "Conversion successful".to_string(),
            file_id: Some(output_filename),
        }))
    } else {
        Ok(HttpResponse::BadRequest().json(ApiResponse {
            success: false,
            message: "No file uploaded".to_string(),
            file_id: None,
        }))
    }
}

async fn convert_youtube(
    req: web::Json<YouTubeRequest>,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let file_id = Uuid::new_v4().to_string();
    let temp_video = data.upload_dir.join(format!("{}.mp4", file_id));
    let output_filename = format!("{}.{}", file_id, req.format);
    let output_path = data.output_dir.join(&output_filename);

    // Download video using yt-dlp
    let yt_output = Command::new("yt-dlp")
        .arg("-f")
        .arg("bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best")
        .arg("-o")
        .arg(&temp_video)
        .arg(&req.url)
        .output()
        .map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("yt-dlp error: {}", e))
        })?;

    if !yt_output.status.success() {
        return Ok(HttpResponse::InternalServerError().json(ApiResponse {
            success: false,
            message: format!(
                "YouTube download failed: {}",
                String::from_utf8_lossy(&yt_output.stderr)
            ),
            file_id: None,
        }));
    }

    // Convert to audio using ffmpeg
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-i")
        .arg(&temp_video)
        .arg("-y")
        .arg("-vn");

    if let Some(quality) = &req.quality {
        cmd.arg("-b:a").arg(format!("{}k", quality));
    } else {
        cmd.arg("-q:a").arg("0");
    }

    cmd.arg(&output_path);

    let ffmpeg_output = cmd.output().map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("FFmpeg error: {}", e))
    })?;

    // Clean up temp video
    if let Err(e) = fs::remove_file(&temp_video) {
        eprintln!("Warning: Failed to clean up temp video: {}", e);
    }

    if !ffmpeg_output.status.success() {
        return Ok(HttpResponse::InternalServerError().json(ApiResponse {
            success: false,
            message: format!(
                "Audio extraction failed: {}",
                String::from_utf8_lossy(&ffmpeg_output.stderr)
            ),
            file_id: None,
        }));
    }

    Ok(HttpResponse::Ok().json(ApiResponse {
        success: true,
        message: "YouTube conversion successful".to_string(),
        file_id: Some(output_filename),
    }))
}

async fn update_metadata(
    mut payload: Multipart,
    data: web::Data<AppState>,
) -> Result<HttpResponse> {
    let mut file_path: Option<PathBuf> = None;
    let mut metadata = MetadataRequest {
        artist: None,
        title: None,
        album: None,
        genre: None,
    };
    let file_id = Uuid::new_v4().to_string();

    // Process multipart form data
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition
            .as_ref()
            .and_then(|cd| cd.get_name())
            .unwrap_or("")
            .to_string();
        let filename_opt = content_disposition
            .and_then(|cd| cd.get_filename())
            .map(|s| s.to_string());

        let mut bytes = Vec::new();
        while let Ok(Some(chunk)) = field.try_next().await {
            bytes.extend_from_slice(&chunk);
        }

        match field_name.as_str() {
            "file" => {
                let filename = filename_opt.unwrap_or_else(|| "upload".to_string());
                let filepath = data.upload_dir.join(format!("{}_{}", file_id, filename));
                std::fs::write(&filepath, &bytes)
                    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
                file_path = Some(filepath);
            }
            "artist" => {
                metadata.artist = Some(String::from_utf8(bytes).unwrap_or_default());
            }
            "title" => {
                metadata.title = Some(String::from_utf8(bytes).unwrap_or_default());
            }
            "album" => {
                metadata.album = Some(String::from_utf8(bytes).unwrap_or_default());
            }
            "genre" => {
                metadata.genre = Some(String::from_utf8(bytes).unwrap_or_default());
            }
            _ => {}
        }
    }

    if let Some(input_path) = file_path {
        let ext = input_path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("mp3");
        let output_filename = format!("{}.{}", file_id, ext);
        let output_path = data.output_dir.join(&output_filename);

        let mut cmd = Command::new("ffmpeg");
        cmd.arg("-i").arg(&input_path).arg("-y").arg("-codec").arg("copy");

        if let Some(artist) = &metadata.artist {
            cmd.arg("-metadata").arg(format!("artist={}", artist));
        }
        if let Some(title) = &metadata.title {
            cmd.arg("-metadata").arg(format!("title={}", title));
        }
        if let Some(album) = &metadata.album {
            cmd.arg("-metadata").arg(format!("album={}", album));
        }
        if let Some(genre) = &metadata.genre {
            cmd.arg("-metadata").arg(format!("genre={}", genre));
        }

        cmd.arg(&output_path);

        let output = cmd.output().map_err(|e| {
            actix_web::error::ErrorInternalServerError(format!("FFmpeg error: {}", e))
        })?;

        // Clean up input file
        if let Err(e) = fs::remove_file(&input_path) {
            eprintln!("Warning: Failed to clean up input file: {}", e);
        }

        if !output.status.success() {
            return Ok(HttpResponse::InternalServerError().json(ApiResponse {
                success: false,
                message: format!(
                    "Metadata update failed: {}",
                    String::from_utf8_lossy(&output.stderr)
                ),
                file_id: None,
            }));
        }

        Ok(HttpResponse::Ok().json(ApiResponse {
            success: true,
            message: "Metadata updated successfully".to_string(),
            file_id: Some(output_filename),
        }))
    } else {
        Ok(HttpResponse::BadRequest().json(ApiResponse {
            success: false,
            message: "No file uploaded".to_string(),
            file_id: None,
        }))
    }
}

async fn download_file(
    path: web::Path<String>,
    data: web::Data<AppState>,
) -> Result<actix_files::NamedFile> {
    let filename = path.into_inner();
    let filepath = data.output_dir.join(&filename);
    Ok(actix_files::NamedFile::open(filepath)?)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Create necessary directories
    let upload_dir = PathBuf::from("./uploads");
    let output_dir = PathBuf::from("./outputs");
    fs::create_dir_all(&upload_dir)?;
    fs::create_dir_all(&output_dir)?;

    let app_state = web::Data::new(AppState {
        upload_dir,
        output_dir,
    });

    println!("Starting Anytrack Converter API on http://0.0.0.0:8080");

    HttpServer::new(move || {
        // CORS configuration - NOTE: In production, restrict allowed origins
        // instead of using allow_any_origin() for better security
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(app_state.clone())
            .route("/health", web::get().to(health_check))
            .route("/api/convert", web::post().to(convert_audio))
            .route("/api/youtube", web::post().to(convert_youtube))
            .route("/api/metadata", web::post().to(update_metadata))
            .route("/api/download/{filename}", web::get().to(download_file))
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}
