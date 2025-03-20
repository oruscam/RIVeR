const transformData = (data: any, all: boolean): any => {
  const result: any = {};

  for (const key in data) {
    const section = data[key];
    let magnitude = section.streamwise_velocity_magnitude;
    let magnitude_name = "streamwise_velocity_magnitude";
    if (section.num_stations > 0) {
      if (
        section.interpolated === true &&
        section.artificial_seeding === true
      ) {
        magnitude = section.filled_seeded_vel_profile;
        magnitude_name = "filled_seeded_vel_profile";
      } else if (
        section.interpolated === true &&
        section.artificial_seeding === false
      ) {
        magnitude = section.filled_streamwise_velocity_magnitude;
        magnitude_name = "filled_streamwise_velocity_magnitude";
      } else if (
        section.interpolated === false &&
        section.artificial_seeding === false
      ) {
        magnitude = section.streamwise_velocity_magnitude;
        magnitude_name = "streamwise_velocity_magnitude";
      } else if (
        section.interpolated === false &&
        section.artificial_seeding === true
      ) {
        magnitude = section.seeded_vel_profile;
        magnitude_name = "seeded_vel_profile";
      }
    }
    result[key] = {
      ...section,
      alpha:
        section.alpha !== undefined
          ? parseFloat(section.alpha.toFixed(2))
          : null,
      percentile_5th: section["5th_percentile"],
      percentile_95th: section["95th_percentile"],
      total_Q:
        section.total_Q !== undefined
          ? parseFloat(section.total_Q.toFixed(2))
          : null,
      measured_Q:
        section.measured_Q !== undefined
          ? parseFloat(section.measured_Q.toFixed(2))
          : null,
      interpolated_Q:
        section.interpolated_Q !== undefined
          ? parseFloat(section.interpolated_Q.toFixed(2))
          : null,
      total_A:
        section.total_A !== undefined
          ? parseFloat(section.total_A.toFixed(2))
          : null,
      total_W:
        section.total_W !== undefined
          ? parseFloat(section.total_W.toFixed(2))
          : null,
      activeMagnitude:
        section.streamwise_velocity_magnitude !== undefined ? magnitude : null,
    };
  }

  if (data.summary === undefined) {
    return result;
  }
  result.summary = formatSummary(data.summary);

  return result;
};

const formatSummary = (summary: any): any => {
  const formatValue = (value: number) => parseFloat(value.toFixed(2));

  const formatStatistics = (stats: any) => ({
    total_W: formatValue(stats.total_W),
    total_A: formatValue(stats.total_A),
    total_Q: formatValue(stats.total_Q),
    mean_V: formatValue(stats.mean_V),
    alpha: formatValue(stats.alpha),
    mean_Vs: formatValue(stats.mean_Vs),
    max_depth: formatValue(stats.max_depth),
    average_depth: formatValue(stats.average_depth),
    measured_Q: formatValue(stats.measured_Q),
  });

  return {
    mean: formatStatistics(summary.mean),
    std: formatStatistics(summary.std),
    cov: formatStatistics(summary.cov),
  };
};

export { transformData };
