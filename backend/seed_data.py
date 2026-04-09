"""Starter content for the leaderboard database and character endpoint."""

CHARACTERS = [
    {
        "id": "sahoor-sproing",
        "name": "Sahoor Sproing",
        "title": "Alarm-Clock Acrobat",
        "description": "A midnight pan-banger who turns every wake-up call into a moon jump.",
        "color": "#ff9f68",
        "accent": "#ffd166",
        "ability": {
            "id": "high-jump",
            "name": "Skybound Ankles",
            "description": "Jumps higher than the rest of the roster.",
            "jump_multiplier": 1.18,
        },
    },
    {
        "id": "sixty-hex",
        "name": "Sixty Hex",
        "title": "Patch-Note Speedster",
        "description": "A living version number with permanent speedrunner energy.",
        "color": "#64f5d2",
        "accent": "#6c63ff",
        "ability": {
            "id": "fast-speed",
            "name": "Patch Sprint",
            "description": "Runs faster and keeps momentum better on long jumps.",
            "speed_multiplier": 1.14,
        },
    },
    {
        "id": "gobbo-gacha",
        "name": "Gobbo Gacha",
        "title": "Loot Goblin Supreme",
        "description": "A tiny chaos merchant who somehow knows the mystery-box meta.",
        "color": "#9ef06a",
        "accent": "#f9c74f",
        "ability": {
            "id": "box-luck",
            "name": "Lucky Gremlin Hands",
            "description": "Mystery boxes lean toward stronger rewards that last longer.",
            "box_luck": 0.22,
        },
    },
    {
        "id": "doctor-oof",
        "name": "Doctor Oof",
        "title": "Certified Respawn Technician",
        "description": "A melodramatic medic with extra bandages and zero chill.",
        "color": "#7cc6fe",
        "accent": "#ff5d8f",
        "ability": {
            "id": "extra-health",
            "name": "Spare Health Bar",
            "description": "Starts each run with one extra heart.",
            "extra_health": 1,
        },
    },
    {
        "id": "cache-money",
        "name": "Cache Money",
        "title": "CDN Wizard",
        "description": "A chrome-shiny gremlin who somehow turns every coin trail into faster combo chains.",
        "color": "#f7d154",
        "accent": "#52b6ff",
        "ability": {
            "id": "combo-cache",
            "name": "Combo Cache",
            "description": "Starts each level with a tiny score bonus and extra mystery-box luck.",
            "box_luck": 0.12,
            "starting_score_bonus": 150,
        },
    },
]

STARTER_SCORES = [
    ("ByteBiscuit", 6840, "sixty-hex", "win", '{"coins":48,"levelsCleared":4}'),
    ("NoodleWizard", 5720, "gobbo-gacha", "win", '{"coins":42,"levelsCleared":4}'),
    ("MoonToast", 4490, "sahoor-sproing", "loss", '{"coins":30,"levelsCleared":3}'),
    ("LagSlapper", 3995, "doctor-oof", "loss", '{"coins":24,"levelsCleared":2}'),
    ("ChairBeast", 2875, "gobbo-gacha", "loss", '{"coins":19,"levelsCleared":2}'),
]
