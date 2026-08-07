-- ==============================================================================
-- PayomboyZ Hub - Stage 3: Multi-Game PlaceId Router (Loader.lua)
-- URL: https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/Loader.lua
-- ==============================================================================

local GameRouter = {
    -- 1. Attack On Titan Revolution (AOTR)
    [13379208636] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/AOTR",
    [14916516914] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/AOTR",
    [14932214603] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/AOTR",
    
    -- 2. Anime Card Farm
    [125039473548047] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/Script",
    
    -- 3. Arena Sniper (Sniper Arena)
    [122446657157717] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/ARNSniper",
    
    -- สคริปต์สำรอง (Default Fallback)
    ["Default"] = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/AOTR"
}

-- ตรวจสอบ PlaceId ของเกมปัจจุบันและโหลดสคริปต์ประจำแมพนั้นๆ
local placeId = game.PlaceId
local scriptTarget = GameRouter[placeId] or GameRouter["Default"]

if scriptTarget and scriptTarget ~= "" then
    pcall(function()
        loadstring(game:HttpGet(scriptTarget))()
    end)
end
