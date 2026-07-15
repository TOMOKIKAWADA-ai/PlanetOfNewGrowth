extends Node3D
class_name CameraRigController

const TRANSITION_SECONDS: float = 0.6

var target: Node3D
var camera: Camera3D
var current_height: float = 7.5
var current_back: float = 6.0
var current_fov: float = 48.0
var target_height: float = 7.5
var target_back: float = 6.0
var target_fov: float = 48.0
var transition_left: float = 0.0
var shake_time: float = 0.0
var shake_strength: float = 0.0

func _ready() -> void:
	camera = $Camera3D as Camera3D
	if camera == null:
		camera = Camera3D.new()
		camera.name = "Camera3D"
		add_child(camera)
	camera.current = true
	camera.fov = current_fov

func set_follow_target(next_target: Node3D) -> void:
	target = next_target
	if target != null:
		global_position = target.global_position

func set_bird_view(enabled: bool) -> void:
	if enabled:
		target_height = 29.0
		target_back = 4.5
		target_fov = 76.0
	else:
		target_height = 7.5
		target_back = 6.0
		target_fov = 48.0
	transition_left = TRANSITION_SECONDS

func _process(delta: float) -> void:
	if target == null:
		return
	global_position = global_position.lerp(target.global_position, minf(delta * 8.0, 1.0))
	if transition_left > 0.0:
		var step: float = minf(delta / TRANSITION_SECONDS, 1.0)
		current_height = lerpf(current_height, target_height, step)
		current_back = lerpf(current_back, target_back, step)
		current_fov = lerpf(current_fov, target_fov, step)
		transition_left -= delta
	else:
		current_height = target_height
		current_back = target_back
		current_fov = target_fov
	var focus: Vector3 = target.global_position + Vector3(0.0, 0.6, 0.0)
	var shake_offset: Vector3 = Vector3.ZERO
	if shake_time > 0.0:
		shake_time = maxf(0.0, shake_time - delta)
		var falloff: float = shake_time
		shake_offset = Vector3(
			randf_range(-shake_strength, shake_strength),
			randf_range(-shake_strength, shake_strength) * 0.35,
			randf_range(-shake_strength, shake_strength)
		) * falloff
	camera.global_position = global_position + Vector3(0.0, current_height, current_back) + shake_offset
	camera.look_at(focus, Vector3.UP)
	camera.fov = current_fov

func shake(duration: float, strength: float) -> void:
	shake_time = maxf(shake_time, duration)
	shake_strength = maxf(shake_strength, strength)
