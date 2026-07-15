extends Area3D
class_name Projectile

var game
var config
var active: bool = false
var from_player: bool = true
var direction: Vector3 = Vector3.FORWARD
var speed: float = 18.0
var damage: float = 10.0
var lifetime: float = 1.0
var pierce_left: int = 0
var radius: float = 0.38
var hit_targets: Dictionary = {}

var mesh_instance: MeshInstance3D
var particles: GPUParticles3D

func setup_pool(game_ref, config_ref) -> void:
	game = game_ref
	config = config_ref
	deactivate()

func _ready() -> void:
	_create_visuals()
	monitoring = false
	visible = false
	set_physics_process(false)

func _create_visuals() -> void:
	var collision: CollisionShape3D = CollisionShape3D.new()
	var shape: SphereShape3D = SphereShape3D.new()
	shape.radius = radius
	collision.shape = shape
	add_child(collision)

	mesh_instance = MeshInstance3D.new()
	var sphere: SphereMesh = SphereMesh.new()
	sphere.radius = 0.22
	sphere.height = 0.44
	mesh_instance.mesh = sphere
	add_child(mesh_instance)

	particles = GPUParticles3D.new()
	particles.amount = 18
	particles.lifetime = 0.28
	particles.emitting = false
	var material: ParticleProcessMaterial = ParticleProcessMaterial.new()
	material.direction = Vector3(0.0, 0.0, 1.0)
	material.spread = 30.0
	material.initial_velocity_min = 0.4
	material.initial_velocity_max = 1.2
	material.scale_min = 0.03
	material.scale_max = 0.09
	particles.process_material = material
	add_child(particles)

func launch(origin: Vector3, target_direction: Vector3, next_speed: float, next_damage: float, player_owned: bool, pierce: int) -> void:
	active = true
	from_player = player_owned
	global_position = origin
	direction = target_direction.normalized()
	speed = next_speed
	damage = next_damage
	pierce_left = pierce
	lifetime = config.projectile_lifetime if config != null else 1.2
	hit_targets.clear()
	visible = true
	monitoring = true
	set_physics_process(true)
	var color: Color = Color(0.65, 0.93, 1.0) if from_player else Color(1.0, 0.28, 0.2)
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = color
	material.emission_enabled = true
	material.emission = color
	material.emission_energy_multiplier = 1.8
	mesh_instance.material_override = material
	var particle_mat: ParticleProcessMaterial = particles.process_material as ParticleProcessMaterial
	if particle_mat != null:
		particle_mat.color = Color(color.r, color.g, color.b, 0.8)
	particles.emitting = true

func _physics_process(delta: float) -> void:
	if not active or game == null:
		return
	if game.is_gameplay_paused():
		return
	lifetime -= delta
	if lifetime <= 0.0:
		deactivate()
		return
	global_position += direction * speed * delta
	if from_player:
		var hit = game.get_projectile_player_hit(global_position, radius, hit_targets)
		if hit != null:
			hit_targets[hit.get_instance_id()] = true
			hit.take_damage(damage)
			if pierce_left <= 0:
				deactivate()
			else:
				pierce_left -= 1
	else:
		if game.player != null and game.player.can_be_hit_by_enemy_projectile(global_position, 1.15):
			game.player.take_damage(damage)
			deactivate()
	if game != null and Vector2(global_position.x, global_position.z).length() > game.get_map_radius() + 6.0:
		deactivate()

func deactivate() -> void:
	active = false
	visible = false
	monitoring = false
	set_physics_process(false)
	hit_targets.clear()
