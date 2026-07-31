-- ==========================================
-- 🔑 KEY SYSTEM LOADER — Anime Card Farm (Multi-Key)
-- ==========================================

-- 1. รายการคีย์ทั้งหมดที่อนุญาตให้ใช้งาน (30 คีย์)
local VALID_KEYS = {
    ["PAYO-8F92-K71A-M09X"] = true,
    ["PAYO-3B8Z-9X1Q-C47L"] = true,
    ["PAYO-H62M-P45K-8W1N"] = true,
    ["PAYO-7R1X-L90C-V23B"] = true,
    ["PAYO-Q59P-2K4W-M81J"] = true,
    ["PAYO-1X7C-M49Z-P03K"] = true,
    ["PAYO-9B2N-8K7Q-W51X"] = true,
    ["PAYO-L40X-R62P-C89V"] = true,
    ["PAYO-5M8K-1Z3B-P74Q"] = true,
    ["PAYO-V91C-X40M-K27L"] = true,
    ["PAYO-2Q7W-P89Z-M10X"] = true,
    ["PAYO-K83N-C51X-R94B"] = true,
    ["PAYO-6X9P-M02K-Z47C"] = true,
    ["PAYO-R14B-8W7X-P90M"] = true,
    ["PAYO-C30Z-K59Q-M82X"] = true,
    ["PAYO-M72X-P10C-B49K"] = true,
    ["PAYO-9W8P-Z23M-K61C"] = true,
    ["PAYO-X51K-C49B-R07M"] = true,
    ["PAYO-4B8M-Q90X-Z31K"] = true,
    ["PAYO-Z12C-M89P-K50X"] = true,
    ["PAYO-7K4X-B03M-P91C"] = true,
    ["PAYO-M39P-C10Z-K82W"] = true,
    ["PAYO-8R2C-X74K-M51P"] = true,
    ["PAYO-K90Z-P23B-X61M"] = true,
    ["PAYO-1C8X-M49P-K70Z"] = true,
    ["PAYO-Q42M-K81Z-P90C"] = true,
    ["PAYO-X61B-C50K-M39P"] = true,
    ["PAYO-5P8Z-M23X-K10C"] = true,
    ["PAYO-C90K-X74M-P12B"] = true,
    ["PAYO-8M1Z-K90P-C23X"] = true,
}

-- 2. ลิงก์ Raw สคริปต์หลักของคุณ
local SCRIPT_URL = "https://raw.githubusercontent.com/payomboyz333/Anime-Card-Farm/refs/heads/main/Script"

-- ==========================================
-- 🎨 UI BUILDER
-- ==========================================
local CoreGui = game:GetService("CoreGui")
local TweenService = game:GetService("TweenService")

if CoreGui:FindFirstChild("PayomboyZ_KeyUI") then
    CoreGui.PayomboyZ_KeyUI:Destroy()
end

local KeyGui = Instance.new("ScreenGui")
KeyGui.Name = "PayomboyZ_KeyUI"
KeyGui.ResetOnSpawn = false
KeyGui.Parent = CoreGui

local MainFrame = Instance.new("Frame")
MainFrame.Size = UDim2.new(0, 330, 0, 200)
MainFrame.Position = UDim2.new(0.5, -165, 0.5, -100)
MainFrame.BackgroundColor3 = Color3.fromRGB(18, 18, 28)
MainFrame.BorderSizePixel = 0
MainFrame.Parent = KeyGui

local UICorner = Instance.new("UICorner"); UICorner.CornerRadius = UDim.new(0, 10); UICorner.Parent = MainFrame
local UIStroke = Instance.new("UIStroke"); UIStroke.Color = Color3.fromRGB(99, 102, 241); UIStroke.Thickness = 1.5; UIStroke.Parent = MainFrame

local Glow = Instance.new("Frame"); Glow.Size = UDim2.new(1, 0, 0, 3); Glow.BackgroundColor3 = Color3.fromRGB(99, 102, 241); Glow.BorderSizePixel = 0; Glow.Parent = MainFrame
local Title = Instance.new("TextLabel"); Title.Size = UDim2.new(1, 0, 0, 45); Title.BackgroundTransparency = 1; Title.Text = "🔑 ANIME CARD FARM — KEY SYSTEM"; Title.TextSize = 12; Title.Font = Enum.Font.GothamBold; Title.TextColor3 = Color3.fromRGB(240, 240, 255); Title.Parent = MainFrame

local KeyInput = Instance.new("TextBox")
KeyInput.Size = UDim2.new(1, -40, 0, 38)
KeyInput.Position = UDim2.new(0, 20, 0, 55)
KeyInput.BackgroundColor3 = Color3.fromRGB(28, 28, 42)
KeyInput.BorderSizePixel = 0
KeyInput.PlaceholderText = "กรอกคีย์ที่นี่..."
KeyInput.Text = ""
KeyInput.TextColor3 = Color3.fromRGB(255, 255, 255)
KeyInput.PlaceholderColor3 = Color3.fromRGB(120, 120, 150)
KeyInput.TextSize = 12
KeyInput.Font = Enum.Font.GothamMedium
KeyInput.Parent = MainFrame

local InputCorner = Instance.new("UICorner"); InputCorner.CornerRadius = UDim.new(0, 6); InputCorner.Parent = KeyInput
local InputStroke = Instance.new("UIStroke"); InputStroke.Color = Color3.fromRGB(50, 50, 75); InputStroke.Thickness = 1; InputStroke.Parent = KeyInput

local SubmitBtn = Instance.new("TextButton")
SubmitBtn.Size = UDim2.new(1, -40, 0, 38)
SubmitBtn.Position = UDim2.new(0, 20, 0, 105)
SubmitBtn.BackgroundColor3 = Color3.fromRGB(99, 102, 241)
SubmitBtn.BorderSizePixel = 0
SubmitBtn.Text = "ตรวจสอบคีย์"
SubmitBtn.TextSize = 13
SubmitBtn.Font = Enum.Font.GothamBold
SubmitBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
SubmitBtn.AutoButtonColor = false
SubmitBtn.Parent = MainFrame

local BtnCorner = Instance.new("UICorner"); BtnCorner.CornerRadius = UDim.new(0, 6); BtnCorner.Parent = SubmitBtn

local StatusText = Instance.new("TextLabel")
StatusText.Size = UDim2.new(1, 0, 0, 20)
StatusText.Position = UDim2.new(0, 0, 0, 160)
StatusText.BackgroundTransparency = 1
StatusText.Text = ""
StatusText.TextSize = 11
StatusText.Font = Enum.Font.GothamMedium
StatusText.TextColor3 = Color3.fromRGB(239, 68, 68)
StatusText.Parent = MainFrame

-- Drag System
local dragging, dragInput, dragStart, startPos
MainFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true; dragStart = input.Position; startPos = MainFrame.Position
        input.Changed:Connect(function() if input.UserInputState == Enum.UserInputState.End then dragging = false end end)
    end
end)
MainFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then dragInput = input end
end)
game:GetService("UserInputService").InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        local delta = input.Position - dragStart
        MainFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    end
end)

-- ==========================================
-- ⚙️ LOGIC & CHECKING KEY
-- ==========================================
SubmitBtn.MouseButton1Click:Connect(function()
    local userKey = KeyInput.Text:gsub("%s+", "") -- ลบช่องว่างออก
    
    -- 📌 ตรงนี้คือส่วนที่เอา VALID_KEYS[userKey] มาตรวจสอบ
    if VALID_KEYS[userKey] then
        StatusText.TextColor3 = Color3.fromRGB(34, 197, 94)
        StatusText.Text = "✅ คีย์ถูกต้อง! กำลังดึงสคริปต์..."
        SubmitBtn.Text = "กำลังโหลด..."
        
        task.wait(0.8)
        
        TweenService:Create(MainFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 330, 0, 0), BackgroundTransparency = 1}):Play()
        task.wait(0.3)
        KeyGui:Destroy()
        
        -- โหลดสคริปต์หลักจาก GitHub Raw
        local success, err = pcall(function()
            loadstring(game:HttpGet(SCRIPT_URL))()
        end)
        
        if not success then
            warn("[Error]: ไม่สามารถโหลดสคริปต์หลักได้ -> " .. tostring(err))
        end
    else
        StatusText.TextColor3 = Color3.fromRGB(239, 68, 68)
        StatusText.Text = "❌ คีย์ไม่ถูกต้อง ลองใหม่อีกครั้ง"
        
        local origPos = MainFrame.Position
        for i = 1, 3 do
            MainFrame.Position = origPos + UDim2.new(0, 5, 0, 0); task.wait(0.04)
            MainFrame.Position = origPos - UDim2.new(0, 5, 0, 0); task.wait(0.04)
        end
        MainFrame.Position = origPos
    end
end)
