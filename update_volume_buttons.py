# -*- coding: utf-8 -*-
import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match volume up buttons with tvCommand
old_volume_up = r'<button class="tv-btn-square" onclick="tvCommand\(this, \'volumeUp\'\)" data-device-id="(\d+)" aria-label="Volume \+">'
new_volume_up = r'<button class="tv-btn-square tv-volume-btn-up" onmousedown="startVolumeRepeat(this, \'up\')" onmouseup="stopVolumeRepeat()" onmouseleave="stopVolumeRepeat()" ontouchstart="startVolumeRepeat(this, \'up\')" ontouchend="stopVolumeRepeat()" aria-label="Volume +">'

# Pattern to match volume down buttons with tvCommand
old_volume_down = r'<button class="tv-btn-square" onclick="tvCommand\(this, \'volumeDown\'\)" data-device-id="(\d+)" aria-label="Volume -">'
new_volume_down = r'<button class="tv-btn-square tv-volume-btn-down" onmousedown="startVolumeRepeat(this, \'down\')" onmouseup="stopVolumeRepeat()" onmouseleave="stopVolumeRepeat()" ontouchstart="startVolumeRepeat(this, \'down\')" ontouchend="stopVolumeRepeat()" aria-label="Volume -">'

# Replace all volume up buttons
content = re.sub(old_volume_up, new_volume_up, content)

# Replace all volume down buttons
content = re.sub(old_volume_down, new_volume_down, content)

# Write the modified content back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated successfully!")
print("Volume buttons now control slider with repeat-on-hold functionality.")
