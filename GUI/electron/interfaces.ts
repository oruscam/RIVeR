
/*Interfaces for the FFProbeData object returned by the ffprobe command.*/

interface Stream {
    index: number;
    codec_name: string;
    codec_long_name: string;
    profile: string;
    codec_type: string;
    codec_tag_string: string;
    codec_tag: string;
    width: number;
    height: number;
    coded_width: number;
    coded_height: number;
    closed_captions: number;
    film_grain: number;
    has_b_frames: number;
    sample_aspect_ratio: string;
    display_aspect_ratio: string;
    pix_fmt: string;
    level: number;
    color_range: string;
    color_space: string;
    color_transfer: string;
    color_primaries: string;
    chroma_location: string;
    field_order: string;
    refs: number;
    is_avc: string;
    nal_length_size: number;
    id: string;
    r_frame_rate: string;
    avg_frame_rate: string;
    time_base: string;
    start_pts: number;
    start_time: number;
    duration_ts: number;
    duration: number;
    bit_rate: number;
    max_bit_rate: string;
    bits_per_raw_sample: number;
    nb_frames: number;
    nb_read_frames: string;
    nb_read_packets: string;
    extradata_size: number;
    tags: object;
    disposition: object;
  }
  
interface Format {
    filename: string;
    nb_streams: number;
    nb_programs: number;
    format_name: string;
    format_long_name: string;
    start_time: number;
    duration: number;
    size: number;
    bit_rate: number;
    probe_score: number;
    tags: {
      major_brand: string;
      minor_version: string;
      compatible_brands: string;
      creation_time: string;
    };
  }
  
export interface FFProbeData {
    streams: Stream[];
    format: Format;
  }
  
// Interfaces for the metadata object returned by the video-metadata IPC handler.   

export interface Metadata {
  streams: {
    width: number;
    height: number;
    r_frame_rate: string;
    duration: number;
  }[];
}
