

<div align="center">
<h1 align="center">User Manual</h1>
<br />
  <img src="river/docs/_static/river_logo.svg" width="350px">
  <br />
  <br />
  <p>
    <strong>Modern LSPIV toolkit for water-surface velocity analysis and flow discharge measurements</strong>
  </p>
</div>


# Content

[1. Introduction](#1-introduction)  
[2. Installation](#2-installation)  
[3. Home Screen](#3-home-screen)  
[4. Camera Calibration (Optional Tool)](#4-camera-calibration-optional-tool)  
[5. Starting a New Project / Loading an Existing One](#5-starting-a-new-project--loading-an-existing-one)  
[6. Select Kind of Footage](#6-select-kind-of-footage)  
[7. Define Video Range](#7-define-video-range)  
[8. Rectification Step (Depends on Footage Type)](#8-rectification-step-depends-on-footage-type)  
[9. Define Cross Section(s)](#9-define-cross-sections)  
[10. Define PIV Parameters](#10-define-piv-parameters)  
[11. Analyze All Frames](#11-analyze-all-frames)  
[12. View Results](#12-view-results)  
[13. Export Summary](#13-export-summary)




# 1. Introduction

**RIVeR** (Rectification of Image Velocity Results) is a modern, open-source toolkit for Large Scale Particle Image Velocimetry (**LSPIV**) developed by [ORUS](https://orus.cam/). It allows you to analyze water-surface velocities and estimate flow discharge from video footage using an intuitive graphical interface.

RIVeR is designed for:
- **Beginners**: offering default settings and guided steps.
- **Advanced users**: providing advanced parameter controls and customizable analysis.

While RIVeR also provides a CLI (Command-Line Interface) for automation and scripting, this manual focuses only on the **Graphical User Interface (GUI)**.

Key GUI features:
- Multi-source video processing (drones, oblique cameras, fixed stations)
- Interactive cross-section and ground reference point setup
- FFT-based multi-pass PIV analysis
- Real-time visualization and automated report generation
- Multi-language support (English, Spanish, French, Portuguese, Italian, German)

---
# 2. Installation

You can install RIVeR using **precompiled standalone packages** for your operating system.  
No Python or developer tools are required.

| OS        | Package Type | Download Link                                                                                      |
|------------|--------------|---------------------------------------------------------------------------------------------------|
| **Windows** | `.exe`       | [RIVeR-Windows-3.3.0-Setup.exe](https://github.com/oruscam/RIVeR/releases/download/v3.3.0/RIVeR-Windows-3.3.0-Setup.exe) |
| **macOS**   | `.dmg`       | [RIVeR-Mac-3.3.0-Installer.dmg](https://github.com/oruscam/RIVeR/releases/download/v3.3.0/RIVeR-Mac-3.3.0-Installer.dmg) |
| **Linux**   | `.deb` / `.rpm` | [RIVeR-Linux-3.3.0.deb](https://github.com/oruscam/RIVeR/releases/download/v3.3.0/RIVeR-Linux-3.3.0.deb) / [RIVeR-Linux-3.3.0.rpm](https://github.com/oruscam/RIVeR/releases/download/v3.3.0/RIVeR-Linux-3.3.0.rpm) |

## Installation Steps

1. Download the installer for your OS.
2. Run the installer and follow the on-screen instructions.
3. Launch the application.

> 💡 **Note:**  
> If your OS blocks the app because it’s unsigned, allow it manually via your security settings.  
> **MacOS users:** check the discussion and workaround here → [GitHub Discussions #76](https://github.com/oruscam/RIVeR/discussions/76).
## Additional Resources

For a deeper understanding of LSPIV measurement techniques, rectification methods, and camera setup principles, refer to our official guidelines:

- [LSPIV Guidelines (English and Spanish)](https://github.com/oruscam/lspiv-guidelines/releases)

>  💡 **Note:**  
> These guidelines were developed by our team to support general LSPIV measurements.  
> While not specific to RIVeR, they provide valuable background on the theoretical and technical concepts used behind the scenes in the software.

---
# 3. Home Screen

<figure>
    <img src="river/docs/_static/00%20-%20Home.png" width=800>
    <p><i>RIVeR 3.1.0 Home screen</i></p>
</figure>

To begin, double click on the icon <img src="https://github.com/oruscam/RIVeR/blob/main/gui/icons/100x100.png?raw=true" alt="icon" width="24"/>
.


When you open RIVeR, you arrive at the Home screen.

Here you can:

- **Start** → Begin a new project.
- **Load Project** → Open a previously saved project.
- **Calibrate Camera** (camera icon, bottom-left) → Open the Camera Calibration tool. See [4. Camera Calibration (Optional Tool)](#4-camera-calibration-optional-tool).
- **Check Version** → See the current installed version (shown at the bottom).
- **Select Language** → Change the interface language (bottom, globe icon).

This is the only screen with a single, centered layout.  
Once you start or load a project, the interface switches to the two-panel workflow view.

---

# 4. Camera Calibration (Optional Tool)

<figure>
    <img src="river/docs/_static/09%20-%20Calibration.png" width=800>
    <p><i>Camera Calibration tool, opened from the Home screen</i></p>
</figure>

This tool is **independent of any project** — it can be opened at any time from the **camera icon** in the bottom-left corner of the Home screen, before you start or load a project. It doesn't require a video; instead, it works from a folder of still photos of a calibration pattern.

> 💡 **Note:**  
> This is not the same as the **Fixed Camera — Control Points** step described in [8. Rectification Step](#8-rectification-step-depends-on-footage-type).  
> - **Camera Calibration** (this tool) solves the camera's **intrinsic** parameters — focal length, principal point, and lens distortion — from photos of a calibration board. Its only purpose is to **undistort (correct lens distortion in) extracted video frames** before they are processed.  
> - **Fixed Camera — Control Points** solves the camera's **extrinsic** parameters (position and orientation in the world) from ground control points, to convert pixel coordinates into real-world coordinates for a specific project.  
> You can use Camera Calibration on its own, or combine it with any footage type that benefits from lens correction (most commonly UAV footage from cameras with noticeable lens distortion, e.g. wide-angle or action-cam lenses).

Once calibrated, a camera can be **saved as a reusable profile** and later selected from the **Define Video Range** step (see [7. Define Video Range](#7-define-video-range)) in any project, without having to recalibrate.

## Workflow steps

1. **Show Board**
- Click **Show Board** to generate a printable/displayable **calibration pattern** (a checkerboard combined with ArUco markers) and open it full-screen in a separate window.
- Print this pattern, or display it on a second screen or tablet.
- Click **⬇ Save PNG** (bottom-right of the board window) to save the pattern image, or press **Esc** to close the board window.

2. **Photograph the board**
- Using the camera you want to calibrate (the same camera/lens you will use to record your river footage), take **many photos** of the printed/displayed board:
  - Vary the **distance**, **angle**, and **position** of the board within the frame (center, corners, edges).
  - Make sure the pattern is **in focus** and well lit — blurry photos are automatically skipped during calibration.
  - The more varied and numerous the photos, the more accurate and reliable the calibration.

3. **Import Images**
- Click **Import Images** and select the folder containing your photos, or **drag and drop** the folder directly onto the right panel.
- Imported photos appear as a **thumbnail carousel** at the bottom of the left panel; click a thumbnail (or use the ◀️ ▶️ arrow keys) to preview it full-size.

4. **Solve**
- Click **Solve** to run the calibration.
- A progress ring shows the percentage complete while RIVeR detects the calibration pattern in each photo.

5. **Review the results**

<figure>
    <img src="river/docs/_static/09%20-%20Calibration%20-%20results.png" width=800>
    <p><i>Calibration results: quality grades, histogram, and recommendations</i></p>
</figure>

Once solved, the right panel shows:
- An **overall quality grade** (Good / Fair / Bad), plus individual grades for: Median RMS, P90 RMS, Coverage, Edge Reach, Pose Spread, and Center Offset.
- A list of **recommendations** for any metric that isn't graded "Good" (e.g. *"Add frames hitting edges/corners; vary angle & distance."*) — follow these and re-import more photos if you want to improve the result.
- A **reprojection error histogram**, showing how accurately the model predicts each detected corner (lower is better).

On the left panel, use the view buttons above the carousel (or keyboard shortcuts `1`, `2`, `h`) to switch between:
- **Original** — the raw photo.
- **Corrected** — the undistorted (lens-corrected) version of the same photo, with the detected corners (red), the model's predicted corners (white), and the error between them (cyan lines) overlaid.
- **Heatmap** — a coverage map showing which parts of the sensor were well sampled by your photos (bright) versus poorly covered (dark).

> 📌 **Tip:**  
> Photos that couldn't be used (too blurry, or the pattern wasn't detected) are shown **dimmed** in the carousel, with a "Not used in calibration" tooltip — you don't need to remove them manually.

6. **Save as a camera profile**
- Fill in a **Camera name** and **Lens** (e.g. zoom level) to identify this calibration — existing names are suggested as you type, so you can add more lenses to a camera you already calibrated.
- The **Resolution** field is filled in automatically from your photos.
- Click **Save**. RIVeR confirms with the folder where the profile was saved.

> ⚠️ **Important:**  
> A saved profile is tied to the **resolution** of the photos used to calibrate it. When selecting a profile later in the Define Video Range step, the video's resolution must match — otherwise RIVeR will ask you to pick a different profile or calibrate again at the correct resolution.

Click **Back** to close the tool and return to the Home screen.

---

# 5. Starting a New Project / Loading an Existing One

From the Home screen, you can choose:

- **Start** → Begin a new project from scratch.
- **Load Project** → Open a previously saved project.


## How Project Saving Works

Whenever you start a new project, RIVeR automatically saves your work in the background.

Saved projects are stored in:
/Users/username/river/`<video_name>`/`<timestamped_subfolder>`

- `<video_name>` → The name of the video file you are processing.
- `<timestamp>` → A folder named with the creation date and time, e.g., `20250718T1123` (YYYYMMDDTHHMM).

> **Example:**  
> `/Users/username/river/Suquia/20250718T1123/`

This structure allows you to **process the same video multiple times with different settings**, and each session will be saved in its own timestamped subfolder.


## Loading an Existing Project

When you click **Load Project**, RIVeR will prompt you to select the folder of a previously saved project.

You must select the correct timestamped subfolder inside:
/Users/username/river/<video_name>/

Once loaded, you can continue the analysis, adjust settings, or directly export results.

> 📌  **Tip:** Use the “Load Project” option if you want to revisit past work, compare different settings, or avoid reprocessing.
---

# 6. Select Kind of Footage

<figure>
    <img src="river/docs/_static/01%20-%20Footage.png" width=800>
    <p><i>Select the kind of footage to process and add your video file</i></p>
</figure>

After clicking **Start** on the Home screen, you will be asked to select the type of footage you want to process.  
The interface now includes a **drag-and-drop area** and an **“Open Folders”** button for convenient file selection.

You can choose between:

- **UAV (Drone icon, left)**  
  Aerial footage, typically an orthogonal (top-down) view of the water surface.  
  Assumes a simple pixel-to-real-world scaling, where pixels are uniformly sized.

- **Oblique View (Tripod icon, middle)**  
  Footage from a camera placed on a riverbank or tripod, showing the flow at an angle.  
  Requires perspective correction using vanishing points, as pixel sizes vary with distance.

- **Fixed Camera (Surveillance icon, right)**  
  Footage from a permanently installed, fixed-position camera for continuous monitoring.  
  Involves more complex rectification using camera calibration and detailed ground surveys.

Behind the scenes, this choice determines **how pixel coordinates are related to real-world coordinates** (rectification).  
It defines whether a simple scale, a homography matrix, or a full camera matrix will be used to transform image measurements into physical units.

> 💡 **Note:**  
> From left to right, the options represent increasing complexity in topographic correction.  
> However, RIVeR allows flexibility — you can process any footage type, even if, for example, your drone footage was recorded with an oblique angle.

---

## Selecting the Video

Once you have selected the footage type, RIVeR will prompt you to **add your video file** in one of two ways:

1. **Drag and drop** your video directly into the highlighted area.  
2. Click **“Open Folders”** to browse and select the video file manually.

After adding your footage, click **“Next”** to continue to the next step.

> **Advanced context (for reference, not required to use RIVeR):**  
> Rectification methods in RIVeR rely on projective geometry concepts such as camera matrices and homography matrices.  
> The chosen method depends on the type of footage and available survey data, balancing simplicity and accuracy.


## Navigation: Next and Back Buttons

From this point onward, the RIVeR interface will **always display “Next” and “Back” buttons** at the bottom of the screen.

- **Next** → Move forward to the next step.
- **Back** → Return to the previous step.

> **Why this matters:**  
> RIVeR is designed so that users **cannot skip steps** by accident, and they can always go back to review or adjust settings before continuing.

This makes the workflow **linear but flexible**, ensuring all required information is set correctly before the final results and export.

---

# 7. Define Video Range

<figure>
    <img src="river/docs/_static/02%20-%20Video%20Range.png" width=800>
    <p><i>Define the video range for frame extraction</i></p>
</figure>

From this step onward, the RIVeR interface is **always divided into two main parts**:

- **Left panel** → Video view and workspace.
- **Right panel** → Parameters, input fields, and controls.

At the top-right, you will see a **progress bar** showing your current position in the 7-step workflow, ending with the automatically generated discharge report.


## Reminder: How LSPIV Works

Before continuing, it’s important to understand that LSPIV (Large-Scale Particle Image Velocimetry) is based on the assumption that:

- There are visible **tracers** (like foam, bubbles, debris) moving on the water surface.
- These tracers travel at the **same speed as the surface water flow**.

> ⚠️ **Important:**  
> Without visible tracers, velocity cannot be measured.  
> If tracers move too fast (making flow direction unclear) or too slow (where measurement error becomes proportionally large), the technique’s reliability decreases.

Most videos are recorded at **30 frames per second (fps)**, but this can vary.


## How to Use This Step

At the **end of this step**, RIVeR will extract frames from the video to prepare them for processing.

- **Left panel (Video Player):**  
  Play ⏯️ / ⏸️ pause the video, move the cursor, preview frames.

- **Right panel (Video Range Settings):**
  - **Start / End** → Define the time range to process.
    - Enter time **in seconds** (e.g., `70` → converts to `01:10`).
    - Or directly as `MM:SS`.
    - Alternatively, move the player cursor and click **Start** or **End** — it will auto-fill the time fields.

  - **Frame Interval** → Set how often frames are extracted.
    - `1` → Use all frames.
    - `2` → Use every other frame, and so on.

> 📌 **Tip:**  How to choose the frame interval:
> There is **no single correct value**.  
> - If tracer movement is **barely visible** (less than a pixel per frame), increase the interval to make displacement clearer.  
> - If tracer displacement is **too large between frames**, decrease the interval for better accuracy.  
> The goal is to achieve **a neat, visible displacement** of surface tracers between frames.
> - You can also **use ◀️ and  ▶️ arrow buttons** below the player to preview how tracers will move between frames with the chosen frame interval.


- **Below the Frame Interval field, video metadata:**
  - File name.
  - Total length.
  - Resolution.
  - FPS (frames per second).


## Advanced Settings (Unlockable Features)

At the bottom right, you will see a **lock icon (🔒)**.

By default, RIVeR hides advanced options to keep the workflow smooth and beginner-friendly.  
However, advanced users can **unlock the lock** to access additional features.

For example, at the Video Range selection step, unlocking the lock reveals **frame extraction resolution options**:

<figure>
    <img src="river/docs/_static/02lock%20-%20Video%20Range.png" width=500>
    <p><i>Select frame extraction resolution (advanced option)</i></p>
</figure>

- LSPIV generally does **not** require ultra-high-resolution images.
- Even if your video was recorded in 4K or 8K, the default extraction resolution is typically **downscaled to Full HD (1920x1080)**.
- However, you are free to modify this if desired.

> 💡 **Note:**
> Higher resolutions mean significantly **larger processing time and data size** — adjust with care.

Unlocking the lock also reveals two additional options: **Lens Correction** and, for UAV footage only, **Video Stabilization**.

### Lens Correction

If you have previously calibrated your camera using the [Camera Calibration tool](#4-camera-calibration-optional-tool), you can select the matching **camera / lens profile** here.  
When enabled, RIVeR undistorts every extracted frame using that profile before any further processing.

> ⚠️ **Important:**  
> The profile's calibrated resolution must match your video's resolution. If it doesn't, RIVeR will block you from continuing and ask you to pick another profile or calibrate again at the correct resolution.  
> If no profiles have been saved yet, this toggle is disabled with a hint pointing you to the Camera Calibration tool.

### Video Stabilization (UAV footage only)

<figure>
    <img src="river/docs/_static/02lock%20-%20Stabilization.png" width=500>
    <p><i>Stabilize video toggle and region editor (UAV footage)</i></p>
</figure>

If your drone footage suffers from camera shake or vibration (e.g. hovering drift, wind gusts, gimbal jitter), RIVeR can stabilize the extracted frames before analysis. This option only appears for **UAV footage** — oblique and fixed-camera setups assume a static camera and don't need it.

- Turn on **Stabilize video** to start defining **stabilization regions**.
- A **stabilization region** is a small box you place over a **fixed, static feature** in the scene — for example a rock, a bridge pier, or any solid structure that does **not** move (avoid placing it on the water itself). RIVeR tracks this feature across frames and uses its motion to work out — and cancel out — the camera's own shake.
- **At least 2 regions are required** (RIVeR needs two tracked points to solve for translation, rotation, and scale).

**Placing and editing regions:**
- Click **Add region** to drop a new box (150×150 px by default) onto the video frame.
- **Drag** the box to move it, or drag its **corner handles** to resize it.
- Click the green **confirm** button next to the box once you're happy with its position, or the pencil icon on a region in the list to edit it again.
- Use the trash icon to delete a region.
- While a region is being edited, the rest of the interface dims to keep your focus on placement; you can also **zoom in** (scroll/pinch, centered on your cursor) for more precise placement.

> 💡 **Note:**  
> RIVeR remembers your original (unstabilized) frames — if you toggle stabilization off, or edit regions back to what they were before, it won't waste time re-extracting frames unnecessarily.

Once frames are extracted, you can visually verify the result on the **UAV — Pixel Size** step using the **Stabilization** sanity-check view — see [8. Rectification Step → UAV/Drone — Pixel Size](#8-rectification-step-depends-on-footage-type).


## Navigation: Next and Back Buttons

Remember, from this step onward, RIVeR **always shows “Next” and “Back” buttons** at the bottom.

- **Next** → Move forward.
- **Back** → Return to the previous step.

This lets you review or adjust settings anytime without skipping essential steps.

---

# 8. Rectification Step (Depends on Footage Type)

After selecting the video range, the next screen will depend on the footage type you selected.  
This step defines how RIVeR transforms image measurements (in pixels) into real-world distances — a process called **rectification**.


## <img src="river/docs/_static/drone.png" alt="drone" width="24"/> UAV / Drone — Pixel Size


<figure>
    <img src="river/docs/_static/03%20-%20Pixel%20Size.png" width=800>
    <p><i>Define pixel size for UAV/drone footage</i></p>
</figure>

For UAV footage (top-down view), the rectification workflow is simple:


- **Draw a reference line** on the image between two known points.
  - Click **Draw Line**, then go to the left panel and **click-drag between `Point 1` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/> and `Point 2`** <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>. 
  - This defines the segment that will be used for scale.

- **Enter the real-world distance** (Line Length) between the two points.
  - RIVeR will automatically calculate the **pixel size** based on the drawn line.

> ⚠️ **Important:** 
> The two reference points do **not need to be exactly on the water surface** (they can be on a bridge, rock, or bank),  
> but their vertical position (**Z-coordinate**) should be as close as possible to the water surface elevation.  
> This ensures that the scale you apply matches the flow plane.

> **Shortcut for advanced users:**  
> If you already know the pixel size (e.g., from satellite imagery), you can **enter it directly** into the Pixel Size field without drawing a line.

- Click **Solve** to calculate the rectification parameters.

Once solved, the right panel will display a **real-world view with a scale**, confirming that the transformation has been computed.

### Advanced Settings

<figure>
    <img src="river/docs/_static/03lock%20-%20Pixel%20Size.png" width=500>
    <p><i>Unlock advanced settings to enter exact coordinates</i></p>
</figure>

If you unlock the **lock icon (🔒)**, you can manually enter:
- Exact real-world coordinates of `Point 1` and `Point 2`(East/North).
- Exact pixel coordinates in the image (X/Y).

This offers full control for expert users who need precise calibration.

### Checking Stabilization Results

<figure>
    <img src="river/docs/_static/03%20-%20Pixel%20Size%20-%20Stabilization.png" width=800>
    <p><i>Stabilization sanity-check view (only shown if Video Stabilization was enabled)</i></p>
</figure>

If you enabled **Video Stabilization** in the [Define Video Range](#7-define-video-range) step, a **Stabilization** button appears alongside the frame carousel here.  
Clicking it replaces the preview with a diagnostic composite image built from your stabilized frames:

- **Dark areas** → these regions stayed consistent across frames — stabilization worked well there.
- **Bright / hot areas** → these regions still shifted between frames — stabilization struggled there (e.g. the tracked feature wasn't actually static, or tracking failed).

> 📌 **Tip:**  
> If large parts of the frame appear bright, go back to Define Video Range and try repositioning your stabilization regions onto more clearly static, well-textured features.

Click the **Stabilization** button again to return to browsing individual frames in the carousel.


Once everything is set, click **Next** to continue to the common workflow.

---

## <img src="river/docs/_static/oblique.png" alt="oblique camera" width="24"/> Oblique Camera — Control Points (Distances)



<figure>
    <img src="river/docs/_static/03%20-%20Control%20Points%20(oblique).png" width=800>
    <p><i>Define control points and distances (oblique camera)</i></p>
</figure>

For oblique views (e.g., from a riverbank), the rectification workflow involves selecting control points and defining their real-world distances.


- **Select at least four control points** on the image:
  - Click **Draw Points**, then go to the left panel.
  - Click and place `Point 1` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pinRed.svg" alt="red pin" width="16"/>and `Point 2` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>manually.
  - `Point 3` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>* and `Point 4` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/> will appear automatically — you must position them manually.

> ⚠️ **Important**  
> The control points do **not have to be on the water surface itself**,  
> but their vertical position (**Z-coordinate**) should be as close as possible to the water surface plane.  
> This ensures that the perspective correction applies accurately to the flow layer.

- **Point placement order:**
  -  `Point 1`  <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pinRed.svg" alt="red pin" width="16"/>→ most left and upstream.
  - Follow counterclockwise: `Point 2` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>, `Point 3` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>, `Point 4` <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pin.svg" alt="red pin" width="16"/>.
  - Use your mouse wheel to **zoom in/out** for precise placement.

- **Define the six real-world distances** between the points.
  - The system shows all six pairwise distances:
    - `1-2`, `2-3`, `3-4`, `4-1`, `1-3`, `2-4`.
  - Each distance is color-coded for easy identification.

- **Enter real-world distance values**:
  - Manually type them in on the right panel.
  - Or **import from Excel or text file** following the same order.

- **Solve the homography matrix**:
  - Click **Solve** to calculate the transformation.
  - RIVeR will correct for perspective distortion, ensuring accurate scaling even when pixel sizes vary with distance.


Once finished, click **Next** to continue to the shared workflow.


---

## <img src="river/docs/_static/ipcam.png" alt="fixed camera" width="24"/> Fixed Camera — Control Points (Coordinates)

<figure>
    <img src="river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera).png" width=800>
    <p><i>Import control point coordinates (fixed camera)</i></p>
</figure>

For fixed camera setups, the workflow involves importing **ground control points (GCPs)** with known real-world coordinates and linking them to their pixel positions in the images.  
This enables RIVeR to compute a precise **camera calibration matrix** for rectification.


### Workflow steps

1️⃣ **Import real-world coordinates**
- Click **Import Points** and select a file (CSV, TXT) with at least four columns:
  - Label, East, North, Z
- Points must be **surveyed with GPS or total station**.
- Coordinates should be in **linear distance units** (e.g., meters, feet, UTM) — **not geographic coordinates** (latitude/longitude).
- Once imported:
  - The table on the right fills with the real-world coordinates.
  - A map below shows the point layout.

2️⃣ **Understand the table**
- The table shows:
  - Real-world coordinates: East, North, Z
  - Pixel coordinates (X, Y) — to be defined.
- The goal is to **associate each real-world point to its pixel location** in the images.
> 💡 **Alternative option:**  
> Instead of importing a 4-column file (Label, East, North, Z) and manually placing points,  
> you can also import a **6-column file** (Label, East, North, Z, x, y) where the real-world and pixel coordinates are already matched.  
> This skips the manual placement step and directly fills all required data.

3️⃣ **Import images**
- Click **Import Images** to load a folder of snapshots showing the surveyed points.
>⚠️ **Important:**  
> The camera must **not have moved** during or after the survey.
- **Recommendation:**  
  For each point, capture a dedicated snapshot during the survey, and name the image to match the point label (e.g., `01.jpg` → `PTO 01`).  
  In the carousel (left panel), image names appear as a **gray watermark** on each thumbnail, helping you match images to points.

4️⃣ **Associate points to pixels**

<figure>
    <img src="river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera)%20-%20single%20point.png" width=800>
    <p><i>Example: selecting and placing a control point</i></p>
</figure>

- Select an image in the carousel (displayed larger above).
- In the table, click the row (e.g., `PTO 01`).
- A **red pin** <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pinRed.svg" alt="red pin" width="16"/> will appear on the image.
- Precisely place the pin where the point is located.  
  You can **zoom in/out** using the mouse wheel.
- The pixel coordinates (X, Y) will automatically update in the table.
- Repeat for all points until all are linked.

> ⚠️ **Important:**  
> The control points should **cover the entire image as much as possible**,  
> spanning a wide range of East, North, and elevation (Z) values.  
> Think of them as a **3D cloud of points** to properly constrain the calibration.  
> For robust results, **at least 10 well-distributed points** are recommended.


5️⃣ **Solve camera calibration**

<figure>
    <img src="river/docs/_static/03%20-%20Control%20Points%20(fixed%20camera)%20-%20results.png" width=800>
    <p><i>View after solving the camera matrix</i></p>
</figure>

- Once all points are placed, click **Direct Solve** to calculate the camera matrix.
- A **rectified image** will appear, showing the estimated camera position.
- On the left panel, you will see:
  - **Red lines** showing the reprojection of real-world points.
  - **Yellow ellipses** indicating uncertainty.

On the right panel, you will see:
- Mean **reprojection error** (e.g., in pixels).
- Number of points used for calibration.
- Estimated **camera height**.

You can also click **Optimize** to refine the camera matrix using only selected points, aiming to reduce the reprojection error.


Once you are satisfied with the results, click **Next** to continue to the common workflow.

---

# 9. Define Cross Section(s)

<figure>
    <img src="river/docs/_static/04%20-%20Cross%20Sections.png" width=800>
    <p><i>Define one or more cross sections for discharge calculation</i></p>
</figure>

In this step, you define the **cross sections** where RIVeR will estimate discharge.  
You can define **one or multiple cross sections**, depending on the complexity and goals of your analysis.


<figure>
    <img src="river/docs/_static/04%20-%20Cross%20Sections%20-%20tabs.png" width=500>
    <p><i>Managing multiple cross sections via tabs</i></p>
</figure>

- To **add a new cross section**, click the **`✚` tab**.
- To **remove a cross section**, click the **`ˣ`** that appears next to its name.
- You can **rename any cross section** by clicking on its name.- Use the **eye icon** to toggle visibility between the currently selected cross section and all defined cross sections.



## How to define a cross section

1️⃣ **Draw cross section direction**  
- Click the **Draw Direction** button.  
- On the image (left panel), **click and drag a line from the left bank to the right bank**.  
  - The **starting point (left)** will appear <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pinRed.svg" alt="red pin" width="16"/> **red**.  
  - The **ending point (right)** will appear <img src="https://raw.githubusercontent.com/oruscam/RIVeR/b30280046107d2c2d71f7b25153e452c2e25aa70/gui/src/assets/icons/pinGreen.svg" alt="red pin" width="16"/> **green**.

> ⚠️ **Important:**  
  This line defines the **orientation** of the cross section — it does not define its width.

2️⃣ **Import bathymetry**
- Click **Import bath** to load the bathymetric profile for the selected section.
- The file must be a text or Excel file with **two columns**:
  - **Distance from the left bank** (station)
  - **Either stage (level)** or **depth** at that location
- The imported profile is shown on the right as a stage vs. station plot.

3️⃣ **Enter water surface level (stage)**
- Fill in the **Level** field with the height of the water surface at the moment the video was recorded.

4️⃣ **Cross section geometry**
- The red and green pins on the image define the direction of the cross section and are **projected onto the bathymetry plot**.
- RIVeR uses the bathymetry and water level to calculate the **effective width** of the cross section.

- **Left Bank Station**:  
  By default, this value is `0`, meaning the red pin is assumed to be at the exact start of the cross section (station 0).

> 📌 **Tip:**  
> If, in the field, you placed the red pin **slightly offset** from the true left bank (for example, using a stick or other object to define direction but not the actual bank edge),  
> you can use the **Left Bank Station** field to specify the distance between the **true left bank** and the **red pin location**.  
> This lets RIVeR correctly align the stationing of the bathymetry profile with the physical geometry of the river.

This is especially useful when the red pin is used as a reference marker for orientation but not for precise positioning at station 0.


## Quality check

To verify that everything is correctly aligned:
- In the bathymetry plot, the red ▼ and green ▼ represent the projected positions of the pins.
- If the pins were placed on the river margins in the image, the triangles should align with the two edges of the bathymetry.
- This serves as a good visual check of whether **rectification, orientation, and stage matching** are consistent.


### Advanced Settings

<figure>
    <img src="river/docs/_static/04lock%20-%20Cross%20Sections.png" width=500>
    <p><i>Advanced settings: pin coordinates and Left Bank Station</i></p>
</figure>

If you unlock the **lock icon (🔒)**, you will see:

- **Real-world coordinates** (East/North) for both **red** (left) and **green** (right) pins.
- **Pixel coordinates** (X/Y) for both **red** (left) and **green** (right) pins.


Once the section is fully defined and checked, click **Next** to proceed to the PIV parameter settings.

---
# 10. Define PIV Parameters

<figure>
    <img src="river/docs/_static/05%20-Processing.png" width=800>
    <p><i>Test and adjust PIV settings before full processing</i></p>
</figure>

In this step, you define the **PIV (Particle Image Velocimetry) analysis parameters**.  
This is where you test how well the algorithm tracks surface tracers **before applying it to all frames**.


## What is the ROI?

RIVeR does not process the entire image frame — it focuses only on the **Region of Interest (ROI)**, which is a rectangular area around the defined cross section.

- The **width** of the ROI is determined automatically based on the length of the cross section.
- The **height** is also computed by default but can be adjusted by advanced users.

This strategy greatly **reduces processing time** by ignoring areas irrelevant to the flow measurement.


## Test your settings

- Click the **Test** button to run the PIV algorithm on a **pair of frames** selected from the **carousel at the bottom** (left panel).
- All extracted frames from the video are shown in this carousel. You can choose any frame pair to preview results.
- The resulting velocity vectors will appear over the image (left panel), so you can visually check their quality and consistency.

> 💡 **Note:**  The goal here is to preview and validate the configuration — not to process the whole video yet.

> 📌 **Tip:**  
> A good way to test if the parameters are appropriate is to try several different frame pairs with the **same settings**.  
> If the vectors point in the **expected direction** and appear consistent across various flow conditions,  
> it's a strong indication that your settings are appropriate.

> You may also simply use the **default parameters**. They often provide a good starting point for many typical field recordings.


## Understanding Window Sizes

RIVeR uses a two-pass FFT-based PIV algorithm, with **50% overlap** in both horizontal and vertical directions across the ROI.

- **Step 1 window size:**  
  This defines the size of the interrogation windows during the first pass.  
  It captures general displacement patterns across the ROI using cross-correlation in the frequency domain (FFT).

- **Step 2 window size:**  
  During the second pass, each interrogation window is **deformed** based on the velocity field estimated from Step 1.  
  This helps refine the displacement calculation, improving sub-pixel accuracy and better resolving gradients.

> 💡 **Note:**  
> A typical combination might be `128 → 64` or `64 → 32`,  
> but optimal values depend on tracer size, flow speed, and image resolution.


## Filtering Options

<figure>
    <img src="river/docs/_static/05lock%20-Processing.png" width=500>
    <p><i>Advanced settings (visible after unlocking)</i></p>
</figure>

When you unlock the **lock icon (🔒)**, you can access various **advanced settings**. These are grouped into:


### Pre-processing Filters

These are applied **before** PIV analysis to improve image contrast and reduce noise.

- **Remove Background:**  
  Subtracts static patterns and enhances moving elements (e.g., tracers).

- **CLAHE (Contrast Limited Adaptive Histogram Equalization):**  
  Enhances local contrast for better tracer visibility.  
  - **Clip Limit:** Controls the strength of contrast enhancement. Higher = stronger.


### Post-processing Filters

These are applied **after** velocity fields are computed, to remove outliers based on neighboring vectors.

- **Std Filtering (Standard Deviation Filter):**  
  Removes vectors that deviate significantly from their neighbors, based on a standard deviation **Threshold**.

- **Median Test Filtering:**  
  Removes vectors that differ from the median of nearby vectors.  
  - **Epsilon:** Acceptable deviation.
  - **Threshold:** Filtering tolerance.


### ROI Height

- **ROI Height** controls the vertical size (in pixels) of the Region of Interest.
- It is **automatically calculated** based on the Step 1 window size to ensure efficient coverage above and below the cross section.
- If needed, advanced users can **manually adjust the ROI height** by unlocking the panel.

> 💡 **Note:**  
> Adjusting the ROI may help in cases where the automatically defined region is too small or unnecessarily large, affecting processing time or missing relevant flow.



Once you're happy with the test results, click **Next** to proceed to full PIV processing.

---

# 11. Analyze All Frames

<figure>
    <img src="river/docs/_static/06%20-%20Analizing.png" width=800>
    <p><i>Run full PIV analysis on all frames</i></p>
</figure>

Once you're satisfied with the PIV settings from the previous step, you can now run the algorithm across **all extracted frame pairs**.


## Run full analysis

- Click the **Analyze** button to start processing all frames using the current PIV parameters.
- The right panel shows the **progress as a percentage**, as well as the **estimated remaining time**.
- You can **stop the analysis at any time** using the red **Stop** button.

> 💡 **Note:**  The processing time depends on video length, frame interval, ROI size, and window settings.


##  Browse PIV results

Once the analysis is complete:

- Use the **carousel at the bottom** to scroll through all processed frame pairs.
- The left panel will display the **displacement vector field** over the ROI for each frame pair.

> 📌 **Tip:**   This is a great way to inspect individual results and spot frames with poor tracer quality or motion inconsistencies.


## Median vector field

- In the bottom-left corner, click the **"Median"** button to view the **median velocity field** across all processed frames.
- This median field represents the **final result** that will be used in the **next step (discharge calculation)**.

> 💡 **Note:**   Median filtering helps smooth out anomalies or outliers that may appear in individual frames, providing a more stable result for hydraulic interpretation.


When you’re ready, click **Next** to move on to discharge calculation.

---

# 12. View Results

<figure>
    <img src="river/docs/_static/07%20-%20Results.png" width=800>
    <p><i>Discharge estimation using the computed velocity field and bathymetry</i></p>
</figure>

This step shows the **final results** of your LSPIV processing and computes the **discharge** based on:

- The **median surface velocity field** (computed in the previous step)
- The defined **cross section(s)** and their bathymetry
- The selected **alpha coefficient** (velocity correction factor)


## What’s shown in the interface

- On the **left panel**, the **velocity profile** is shown as color-shaded velocity slices across the cross section, overlaid on the original image.
- The computed **discharge** value is displayed on the right, alongside the **percentage of the cross section that was measured vs. interpolated**.
- Below that is the **alpha coefficient field**, which by default is set to **0.85**, a typical theoretical value for open-channel flow.
> 💡 **Note:**  
> Discharge is calculated using the formula:  
> `Vm = Vs × α`, where:  
> - `Vm` is the mean (depth-averaged) velocity  
> - `Vs` is the surface velocity measured by LSPIV  
> - `α` is the correction coefficient (default: 0.85)

> The alpha value can be changed manually. Every time you change a parameter (including alpha), you must click **"Apply Changes"** to update the results.

> Discharge is computed using the **mid-section method**, integrating local velocities and areas.


## Profile Plots

Three plots are displayed on the right panel:

1. **Discharge Contribution by Station**  
   - Shows the **contribution of each slice** (station) to total discharge.
   - **Red bars**: >10% of total discharge  
   - **Yellow bars**: 5–10%  
   - **Green bars**: <5%

2. **Velocity Profile**
   - The **mean surface velocity profile** is shown as a curve across the section.
   - Transparent shading indicates the **5–95% percentile range** and **±1 standard deviation**.
   - Helps evaluate velocity symmetry and consistency.

3. **Bathymetry**
   - Displays the stage vs. distance (as previously seen in the Cross Section step).
   - Shows how the depth changes across the river.


<figure>
    <img src="river/docs/_static/07%20%20-%20Results%20-%20table.png" width=500>
    <p><i>Summary table and manual profile adjustment</i></p>
</figure>

## Tabular Summary and Controls

Below the plots, a detailed table shows all values used in the discharge computation:

| Column | Description |
|--------|-------------|
| `#`    | Station index |
| `x`    | Distance from the left bank |
| `d`    | Water depth |
| `A`    | Wetted area for the slice |
| `Vs`   | Measured surface velocity |
| `Q`    | Discharge for the slice |

You can **check or uncheck** each station to include or exclude it from the calculation. If **Interpolate Profile** is toggled ON, unselected stations will be interpolated based on **nearest valid results using a Froude number-based approach**.


## Adjustable Parameters

- **Station Number:**  
  Sets how many slices (stations) divide the cross section. A higher number increases resolution.

- **Artificial Seeding (toggle):**  
  Activate if you used artificial floating material (e.g., wood chips, corn) to improve surface texture.  
  This may enhance velocity profile estimation, especially in otherwise textureless water surfaces.

- **Interpolate Profile (toggle):**  
  If enabled, missing velocity data (due to image visibility issues) will be **interpolated using a Froude number approach based on local bathymetry and nearest results**.

> ⚠️ **Important:**   The alpha coefficient is the **most influential parameter** affecting discharge uncertainty. You may adjust it manually or use more precise methods depending on your data and application. See the [LSPIV Guidelines](https://github.com/oruscam/lspiv-guidelines/releases) for more details.


Once you’ve finalized all parameters, click **Apply Changes** to update the result.  
Then click **Next** to proceed to the export step.

---

# 13. Export Summary

<figure>
  <img src="river/docs/_static/08%20-%20Summary.png" width=800>
  <p><i>Final summary screen with auto-generated HTML report</i></p>
</figure>

This is the **last step** in the RIVeR workflow. It summarizes the analysis and lets you export a **detailed HTML report** of the measurement.


## What’s in the Summary

The summary interface is split as usual:

- **Left panel** → Displays the generated **HTML report preview**.
- **Right panel** → Lets you edit metadata and finalize the export.



## Left Panel – Report Contents

The HTML report includes:

1. **Header**
   - River name, site ID, timestamp of measurement
   - Total computed discharge (Q)

2. **Video Information**
   - File name
   - Duration
   - Resolution
   - Frame rate (fps)
   - Creation date

3. **Processed Range**
   - Start / End times
   - Length (in seconds)
   - Frame step and time step
   - Preview thumbnails of selected frames

4. **Cross Section(s)**
   - Name of each section
   - Corresponding discharge values with uncertainty
   - Plot of discharge per segment (color-coded by contribution %)
   - Velocity and stage profiles

5. **Summary Table**

  Each row includes:
  - Width of the cross section  
  - Wetted Area (m²)  
  - Total Discharge Q (m³/s)  
  - Mean velocity (meanV)  
  - Alpha coefficient  
  - Surface velocity (Vs)  
  - Maximum and mean depth  
  - Percentage of the section with valid velocity measurements  

> 💡 **Note:** The table also summarizes **mean, standard deviation, and coefficient of variation (COV)** across sections if multiple are defined.


##  Right Panel – Editable Metadata

Here, the user can:
- Fill or edit:
  - **River’s Name**
  - **Site Name or ID**
- Select:
  - **Unit System**: SI (default) or Imperial  
    (**Selecting the unit system will not convert values – it only sets the unit system for the project.**)
- Adjust:
  - **Measurement Date and Time**  
    (By default, filled from the video metadata but can be changed)



## Final Export

When ready:

- Click **Finish** to choose where to save the **HTML report**.
- A green message appears:  
  ✅ **Analysis Completed!**  
  You can now close RIVeR or return to Home.

> 💡 **Note:**  The report will be saved where you choose and includes all metadata, results, and figures from the session.
