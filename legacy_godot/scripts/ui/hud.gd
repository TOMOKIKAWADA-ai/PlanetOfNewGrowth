extends CanvasLayer
class_name GameHUD

const GameTypes = preload("res://scripts/game_types.gd")

var hp_bar: ProgressBar
var mp_bar: ProgressBar
var xp_bar: ProgressBar
var burst_bar: ProgressBar
var mother_hp_label: Label
var mother_hp_bar: ProgressBar
var time_label: Label
var stats_label: Label
var objective_label: Label
var status_label: Label
var pause_label: Label
var mother_alert_label: Label
var debug_label: Label
var debug_enabled: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_create_ui()

func _create_ui() -> void:
	var root: Control = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var top_left: VBoxContainer = VBoxContainer.new()
	top_left.position = Vector2(18.0, 16.0)
	top_left.custom_minimum_size = Vector2(330.0, 120.0)
	root.add_child(top_left)

	hp_bar = _make_bar("HP")
	top_left.add_child(hp_bar)
	mp_bar = _make_bar("MP")
	top_left.add_child(mp_bar)
	xp_bar = _make_bar("XP")
	top_left.add_child(xp_bar)
	burst_bar = _make_bar("BURST")
	top_left.add_child(burst_bar)

	mother_hp_label = Label.new()
	mother_hp_label.text = "母卵 HP"
	mother_hp_label.visible = false
	mother_hp_label.add_theme_font_size_override("font_size", 16)
	mother_hp_label.add_theme_color_override("font_color", Color(1.0, 0.72, 0.76))
	top_left.add_child(mother_hp_label)

	mother_hp_bar = _make_bar("MOTHER HP")
	mother_hp_bar.visible = false
	top_left.add_child(mother_hp_bar)

	objective_label = Label.new()
	objective_label.text = "卵を探して急降下で破壊"
	objective_label.add_theme_font_size_override("font_size", 18)
	objective_label.add_theme_color_override("font_color", Color(0.88, 0.95, 0.86))
	top_left.add_child(objective_label)

	status_label = Label.new()
	status_label.text = ""
	status_label.add_theme_font_size_override("font_size", 16)
	status_label.add_theme_color_override("font_color", Color(0.7, 0.92, 1.0))
	top_left.add_child(status_label)

	time_label = Label.new()
	time_label.position = Vector2(560.0, 16.0)
	time_label.add_theme_font_size_override("font_size", 24)
	time_label.add_theme_color_override("font_color", Color.WHITE)
	root.add_child(time_label)

	stats_label = Label.new()
	stats_label.position = Vector2(1010.0, 16.0)
	stats_label.custom_minimum_size = Vector2(250.0, 100.0)
	stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stats_label.add_theme_font_size_override("font_size", 17)
	stats_label.add_theme_color_override("font_color", Color(0.9, 0.94, 0.9))
	root.add_child(stats_label)

	mother_alert_label = Label.new()
	mother_alert_label.custom_minimum_size = Vector2(120.0, 36.0)
	mother_alert_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mother_alert_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	mother_alert_label.add_theme_font_size_override("font_size", 22)
	mother_alert_label.add_theme_color_override("font_color", Color(1.0, 0.28, 0.34))
	mother_alert_label.text = "母卵"
	mother_alert_label.visible = false
	root.add_child(mother_alert_label)

	pause_label = Label.new()
	pause_label.set_anchors_preset(Control.PRESET_CENTER)
	pause_label.position = Vector2(-150.0, -28.0)
	pause_label.custom_minimum_size = Vector2(300.0, 56.0)
	pause_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	pause_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	pause_label.add_theme_font_size_override("font_size", 34)
	pause_label.add_theme_color_override("font_color", Color(1.0, 0.96, 0.78))
	pause_label.text = "PAUSE"
	pause_label.visible = false
	root.add_child(pause_label)

	debug_label = Label.new()
	debug_label.position = Vector2(18.0, 590.0)
	debug_label.custom_minimum_size = Vector2(600.0, 120.0)
	debug_label.add_theme_font_size_override("font_size", 15)
	debug_label.add_theme_color_override("font_color", Color(0.68, 1.0, 0.72))
	debug_label.visible = false
	root.add_child(debug_label)

func _make_bar(label: String) -> ProgressBar:
	var bar: ProgressBar = ProgressBar.new()
	bar.custom_minimum_size = Vector2(310.0, 24.0)
	bar.show_percentage = false
	bar.min_value = 0.0
	bar.max_value = 1.0
	bar.value = 1.0
	bar.tooltip_text = label
	return bar

func set_debug_enabled(enabled: bool) -> void:
	debug_enabled = enabled
	if debug_label != null:
		debug_label.visible = enabled

func update_values(
	player,
	time_left: float,
	egg_count: int,
	enemy_count: int,
	mother_spawned: bool,
	mother_hp: float,
	mother_max_hp: float,
	mother_alert_position: Vector2,
	mother_alert_visible: bool,
	game_paused: bool,
	debug_text: String
) -> void:
	if player == null:
		return
	hp_bar.max_value = player.max_hp
	hp_bar.value = player.hp
	hp_bar.tooltip_text = "HP %.0f / %.0f" % [player.hp, player.max_hp]
	mp_bar.max_value = player.max_mp
	mp_bar.value = player.mp
	mp_bar.tooltip_text = "MP %.0f / %.0f" % [player.mp, player.max_mp]
	xp_bar.max_value = player.xp_to_next
	xp_bar.value = player.xp
	xp_bar.tooltip_text = "Lv %d XP %d / %d" % [player.level, player.xp, player.xp_to_next]
	burst_bar.max_value = player.config.burst_max_gauge
	burst_bar.value = player.burst_gauge
	burst_bar.tooltip_text = "Burst %.0f / %.0f" % [player.burst_gauge, player.config.burst_max_gauge]
	var show_mother_hp: bool = mother_spawned and mother_max_hp > 0.0
	mother_hp_label.visible = show_mother_hp
	mother_hp_bar.visible = show_mother_hp
	if show_mother_hp:
		mother_hp_bar.max_value = mother_max_hp
		mother_hp_bar.value = mother_hp
		mother_hp_bar.tooltip_text = "Mother Egg %.0f / %.0f" % [mother_hp, mother_max_hp]
	var minutes: int = floori(time_left / 60.0)
	var seconds: int = int(time_left) % 60
	time_label.text = "%02d:%02d" % [minutes, seconds]
	stats_label.text = "Lv %d\n卵 %d  敵 %d" % [player.level, egg_count, enemy_count]
	objective_label.text = "母卵を破壊" if mother_spawned else "卵を探して破壊"
	var status_parts: Array[String] = []
	if player.is_burst_ready():
		status_parts.append("Burst ready [E]" if player.form == GameTypes.PlayerForm.HUMAN else "Burst: human form only")
	var predation_ratio: float = player.get_predation_wait_ratio()
	if predation_ratio > 0.0:
		status_parts.append("Mother dive %.1fs" % [player.predation_timer] if player.is_diving_mother() else "Auto feed %.1fs" % [player.predation_timer])
	var guard_time: float = player.get_invulnerable_time_left()
	if guard_time > 0.0:
		status_parts.append("Guard %.1fs" % [guard_time])
	status_label.text = " / ".join(status_parts)
	mother_alert_label.visible = mother_alert_visible
	if mother_alert_visible:
		mother_alert_label.position = mother_alert_position - mother_alert_label.custom_minimum_size * 0.5
	pause_label.visible = game_paused
	if debug_enabled:
		debug_label.text = debug_text
