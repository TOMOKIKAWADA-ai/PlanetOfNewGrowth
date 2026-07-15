extends CanvasLayer
class_name ResultScreen

signal restart_requested

var title_label: Label
var detail_label: Label

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_create_ui()
	visible = false

func _create_ui() -> void:
	var shade: ColorRect = ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.0, 0.0, 0.0, 0.68)
	add_child(shade)

	var panel: PanelContainer = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-260.0, -165.0)
	panel.custom_minimum_size = Vector2(520.0, 330.0)
	add_child(panel)

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 24)
	margin.add_theme_constant_override("margin_right", 24)
	margin.add_theme_constant_override("margin_top", 22)
	margin.add_theme_constant_override("margin_bottom", 22)
	panel.add_child(margin)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 18)
	margin.add_child(root)

	title_label = Label.new()
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", 36)
	root.add_child(title_label)

	detail_label = Label.new()
	detail_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	detail_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail_label.add_theme_font_size_override("font_size", 18)
	root.add_child(detail_label)

	var button: Button = Button.new()
	button.text = "R / クリックで再開始"
	button.custom_minimum_size = Vector2(420.0, 48.0)
	button.pressed.connect(func() -> void: restart_requested.emit())
	root.add_child(button)

func show_result(victory: bool, reason: String, survived_time: float) -> void:
	title_label.text = "VICTORY" if victory else "DEFEAT"
	var minutes: int = floori(survived_time / 60.0)
	var seconds: int = int(survived_time) % 60
	detail_label.text = "%s\n生存時間 %02d:%02d" % [reason, minutes, seconds]
	visible = true
