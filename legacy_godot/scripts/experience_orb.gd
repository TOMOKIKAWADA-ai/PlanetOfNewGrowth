extends Area3D
class_name ExperienceOrb

var game
var config
var active: bool = false
var xp_value: int = 1
var mesh_instance: MeshInstance3D

func setup_pool(game_ref, config_ref) -> void:
	game = game_ref
	config = config_ref
	deactivate()

func _ready() -> void:
	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: SphereShape3D = SphereShape3D.new()
	shape.radius = 0.34
	collision.shape = shape
	add_child(collision)

	mesh_instance = MeshInstance3D.new()
	var sphere: SphereMesh = SphereMesh.new()
	sphere.radius = 0.25
	sphere.height = 0.5
	mesh_instance.mesh = sphere
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = Color(0.28, 0.92, 0.55)
	material.emission_enabled = true
	material.emission = Color(0.1, 0.9, 0.42)
	material.emission_energy_multiplier = 1.3
	mesh_instance.material_override = material
	add_child(mesh_instance)
	deactivate()

func spawn(origin: Vector3, amount: int) -> void:
	active = true
	xp_value = amount
	global_position = origin + Vector3(0.0, 0.35, 0.0)
	visible = true
	monitoring = true
	set_physics_process(true)

func _physics_process(delta: float) -> void:
	if not active or game == null or config == null or game.is_gameplay_paused():
		return
	var player = game.player
	if player == null:
		return
	var to_player: Vector3 = player.global_position - global_position
	to_player.y = 0.0
	var distance_squared: float = to_player.length_squared()
	if distance_squared <= config.orb_pickup_radius * config.orb_pickup_radius:
		player.gain_xp(xp_value)
		deactivate()
		return
	if distance_squared <= config.orb_magnet_radius * config.orb_magnet_radius and distance_squared > 0.01:
		global_position += to_player.normalized() * config.orb_speed * delta
	global_position.y = 0.38 + sin(Time.get_ticks_msec() * 0.006 + float(get_instance_id() % 7)) * 0.08

func deactivate() -> void:
	active = false
	visible = false
	monitoring = false
	set_physics_process(false)
