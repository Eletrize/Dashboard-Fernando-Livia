# -*- coding: utf-8 -*-
import re

# Read the file
with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Define the controls with their respective device IDs and macros
# Format: (volume_id, channel_id, macro_on, macro_off, is_htv)
controls = [
    # Varanda TV - lines ~1285
    ('15', '111', 'tvMacroOn()', 'tvMacroOff()'),
    # Varanda HTV - lines ~1480
    ('15', '114', 'htvMacroOn()', 'htvMacroOff()'),
    # Piscina Telão - lines ~3100
    ('16', '114', 'telaoMacroOn()', 'telaoMacroOff()'),
    # Suite 1 TV - lines ~3580
    ('184', '184', 'suite1TvOn()', 'suite1TvOff()'),
    # Suite 1 HTV - lines ~3770
    ('190', '190', 'suite1HtvOn()', 'suite1HtvOff()'),
    # Suite 2 TV - lines ~4170
    ('185', '185', 'suite2TvOn()', 'suite2TvOff()'),
    # Suite 2 HTV - lines ~4360
    ('191', '191', 'suite2HtvOn()', 'suite2HtvOff()'),
    # Suite Master TV - lines ~4770
    ('183', '183', 'suiteMasterTvOn()', 'suiteMasterTvOff()'),
    # Suite Master HTV - lines ~4960
    ('189', '189', 'suiteMasterHtvOn()', 'suiteMasterHtvOff()'),
]

# New volume section template with buttons
def get_new_volume_section(volume_id, channel_id):
    return f'''<!-- BLOCO 4: VOLUME -->
            <div class="tv-control-section tv-control-section--volume-expanded">
              <header class="tv-section-header">
                <h3 class="tv-section-title">Volume</h3>
                <span class="tv-volume-value" id="tv-volume-display">50</span>
                <div class="tv-section-line"></div>
              </header>
              <div class="tv-control-group tv-volume-with-buttons">
                <div class="tv-volume-buttons">
                  <button class="tv-btn-square" onclick="tvCommand(this, 'volumeUp')" data-device-id="{volume_id}" aria-label="Volume +">
                    <img src="images/icons/arrow-up.svg" alt="Volume +" class="tv-btn-icon-img">
                  </button>
                  <button class="tv-btn-square" onclick="tvCommand(this, 'volumeDown')" data-device-id="{volume_id}" aria-label="Volume -">
                    <img src="images/icons/arrow-down.svg" alt="Volume -" class="tv-btn-icon-img">
                  </button>
                </div>
                <div class="tv-volume-slider-wrapper">
                  <input 
                    type="range" 
                    class="tv-volume-slider" 
                    id="tv-volume-slider"
                    min="0" 
                    max="100" 
                    value="50"
                    data-device-id="{volume_id}"
                    aria-label="Controle de Volume"
                  >
                </div>
              </div>
            </div>'''

# Pattern for ON/OFF section to make them side by side (already is side by side via CSS, but let's ensure horizontal layout)
# The current tv-power-group already has display:flex, so we just need CSS changes

# For each volume section, we need to add the buttons
# The pattern to find is the volume section with slider

# Pattern to match volume section (simplified approach - replace section by section)
old_volume_pattern = r'''<!-- BLOCO 4: VOLUME -->
            <div class="tv-control-section">
              <header class="tv-section-header">
                <h3 class="tv-section-title">Volume</h3>
                <span class="tv-volume-value" id="tv-volume-display">50</span>
                <div class="tv-section-line"></div>
              </header>
              <div class="tv-control-group tv-volume-slider-container">
                <input 
                  type="range" 
                  class="tv-volume-slider" 
                  id="tv-volume-slider"
                  min="0" 
                  max="100" 
                  value="50"
                  data-device-id="(\d+)"
                  aria-label="Controle de Volume"
                >
              </div>
            </div>'''

# Also need to handle the slightly different indentation versions
old_volume_pattern_alt = r'''<!-- BLOCO 4: VOLUME -->
                <div class="tv-control-section">
                    <header class="tv-section-header">
                        <h3 class="tv-section-title">Volume</h3>
                        <span class="tv-volume-value" id="tv-volume-display">50</span>
                        <div class="tv-section-line"></div>
                    </header>
                    <div class="tv-control-group tv-volume-slider-container">
                        <input 
                            type="range" 
                            class="tv-volume-slider" 
                            id="tv-volume-slider"
                            min="0" 
                            max="100" 
                            value="50"
                            data-device-id="(\d+)"
                            aria-label="Controle de Volume"
                        >
                    </div>
                </div>'''

def get_new_volume_section_alt(volume_id):
    return f'''<!-- BLOCO 4: VOLUME -->
                <div class="tv-control-section tv-control-section--volume-expanded">
                    <header class="tv-section-header">
                        <h3 class="tv-section-title">Volume</h3>
                        <span class="tv-volume-value" id="tv-volume-display">50</span>
                        <div class="tv-section-line"></div>
                    </header>
                    <div class="tv-control-group tv-volume-with-buttons">
                        <div class="tv-volume-buttons">
                            <button class="tv-btn-square" onclick="tvCommand(this, 'volumeUp')" data-device-id="{volume_id}" aria-label="Volume +">
                                <img src="images/icons/arrow-up.svg" alt="Volume +" class="tv-btn-icon-img">
                            </button>
                            <button class="tv-btn-square" onclick="tvCommand(this, 'volumeDown')" data-device-id="{volume_id}" aria-label="Volume -">
                                <img src="images/icons/arrow-down.svg" alt="Volume -" class="tv-btn-icon-img">
                            </button>
                        </div>
                        <div class="tv-volume-slider-wrapper">
                            <input 
                                type="range" 
                                class="tv-volume-slider" 
                                id="tv-volume-slider"
                                min="0" 
                                max="100" 
                                value="50"
                                data-device-id="{volume_id}"
                                aria-label="Controle de Volume"
                            >
                        </div>
                    </div>
                </div>'''

# Replace function for normal indentation
def replace_volume_normal(match):
    device_id = match.group(1)
    return get_new_volume_section(device_id, device_id)

# Replace function for alternate indentation
def replace_volume_alt(match):
    device_id = match.group(1)
    return get_new_volume_section_alt(device_id)

# First, handle the normal indentation
content = re.sub(old_volume_pattern, replace_volume_normal, content)

# Then handle the alternate indentation
content = re.sub(old_volume_pattern_alt, replace_volume_alt, content)

# Write the modified content back
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("HTML updated successfully!")
print("Volume sections now include up/down buttons with volumeUp and volumeDown commands.")
