# STIV model versions

Every swap of `angle/best_model.pth` or `sign/sign_model.pth` must replace the
weights file *and* its sibling metadata (`runtime_config.json`+`norm_params.json`
for angle, `sign_model_meta.json` for sign) together — the code decodes model
output using values in that metadata, so a mismatched pair silently gives wrong
angles/velocities. Record every swap below, newest first, and give it its own
git commit (not bundled with unrelated changes) referencing this run_name.

## angle/

- **2026-07-28** — 3-seed ensemble, `Wide5BlockAA` (`sti_training/08_champion256`
  champion spec: `ft_Wide5BlockAA_seed{1,2,3}`, fine-tuned on 256px crops).
  Replaces the single-model `GELUModel5Block` deployment below. Inference
  changed alongside this swap: `profile_station()` now runs one clean forward
  pass per member (no noise-TTA) and aggregates with a quality-weighted median
  in slope space instead of a confidence-weighted mean — see
  `docs/superpowers/specs/2026-07-28-stiv-champion-ensemble-robust-aggregation-design.md`.
  norm_params identical across all 3 seeds: min_angle=5.0, max_angle=87.04434204101562.
- **2026-07-24** — `GELUModel_GELUModel5Block_patch_aug_ec_ft_20260716_202556`
  (from the `sti_training` project's `runs/` dir; fine-tuned from
  `..._ec_syn_20260716_200147`, 256px crops).
  norm_params unchanged: min_angle=5.0, max_angle=87.04° — near-90° tan()
  instability noted in the Tekapo/DJI_0008 STIV review is NOT fixed by this swap.
- **2026-06-16** (repo-embed commit `03c5dab`) — `GELUModel_GELUModel5Block_patch_aug_ft_20260611_180808`
  (fine-tuned from `..._syn_20260611_174735`). Previous default, replaced above.

## sign/sign_model.pth

- **2026-06-16** (repo-embed commit `03c5dab`) — `sign_20260611_200106`
  (`SignClassifier5Block`, val accuracy 0.9906). Current, unchanged.
