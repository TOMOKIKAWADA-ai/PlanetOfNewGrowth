extends CanvasLayer
class_name LevelUpScreen

signal upgrade_chosen(upgrade_id: int)

var panel: PanelContainer
var button_box: VBoxContainer

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_create_ui()
	visible = false

func _create_ui() -> void:
	var shade: ColorRect = ColorRect.new()
	shade.set_anchors_preset(Control.PRESET_FULL_RECT)
	shade.color = Color(0.0, 0.0, 0.0, 0.58)
	add_child(shade)

	panel = PanelContainer.new()
	panel.set_anchors_preset(Control.PRESET_CENTER)
	panel.position = Vector2(-250.0, -190.0)
	panel.custom_minimum_size = Vector2(500.0, 380.0)
	add_child(panel)

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 22)
	margin.add_theme_constant_override("margin_right", 22)
	margin.add_theme_constant_override("margin_top", 20)
	margin.add_theme_constant_override("margin_bottom", 20)
	panel.add_child(margin)

	var root: VBoxContainer = VBoxContainer.new()
	root.add_theme_constant_override("separation", 14)
	margin.add_child(root)

	var title: Label = Label.new()
	title.text = "LEVEL UP"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 30)
	root.add_child(title)

	button_box = VBoxContainer.new()
	button_box.add_theme_constant_override("separation", 12)
	root.add_child(button_box)

func show_choices(choices: Array[Dictionary]) -> void:
	for child in button_box.get_children():
		child.queue_free()
	for choice in choices:
		var button: Button = Button.new()
		button.custom_minimum_size = Vector2(450.0, 72.0)
		button.text = "%s\n%s" % [str(choice["name"]), str(choice["description"])]
		button.pressed.connect(_on_choice_pressed.bind(int(choice["id"])))
		button_box.add_child(button)
	visible = true

func hide_screen() -> void:
	visible = false

func _on_choice_pressed(upgrade_id: int) -> void:
	hide_screen()
	upgrade_chosen.emit(upgrade_id)
