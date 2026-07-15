extends CharacterBody3D
class_name EnemyBase

const GameTypes = preload("res://scripts/game_types.gd")
const COLLISION_LAYER_WORLD: int = 1
const COLLISION_LAYER_PLAYER: int = 2
const COLLISION_LAYER_ENEMY: int = 8
const KENNEY_ZOMBIE_PATH: String = "res://assets/kenney/graveyard/character-zombie.glb"
const KENNEY_GHOST_PATH: String = "res://assets/kenney/graveyard/character-ghost.glb"
const KENNEY_SKELETON_PATH: String = "res://assets/kenney/graveyard/character-skeleton.glb"
const KENNEY_VAMPIRE_PATH: String = "res://assets/kenney/graveyard/character-vampire.glb"

var game
var config
var active: bool = true
var enemy_type: int = GameTypes.EnemyType.CHASER
var guard_target

var max_hp: float = 20.0
var hp: float = 20.0
var move_speed: float = 3.0
var damage: float = 8.0
var xp_value: int = 3
var contact_timer: float = 0.0
var shoot_timer: float = 0.0
var orbit_angle: float = 0.0
var destination: Vector3 = Vector3.ZERO
var destination_timer: float = 0.0
var lay_timer: float = 0.0
var life_timer: float = 0.0
var knockback_velocity: Vector3 = Vector3.ZERO

var mesh_instance: MeshInstance3D
var asset_model: Node3D
var head_mesh: MeshInstance3D
var eye_mesh: MeshInstance3D
var barrel_mesh: MeshInstance3D
var left_fin_mesh: MeshInstance3D
var right_fin_mesh: MeshInstance3D
var armor_ring_mesh: MeshInstance3D
var sac_mesh: MeshInstance3D
var core_light: OmniLight3D
var collision_shape: CollisionShape3D

func setup(
	game_ref,
	config_ref,
	next_type: int,
	spawn_position: Vector3,
	next_guard_target
) -> void:
	game = game_ref
	config = config_ref
	enemy_type = next_type
	guard_target = next_guard_target
	global_position = spawn_position
	global_position.y = 0.65
	var hp_bonus: float = 1.0
	var speed_bonus: float = 1.0
	match enemy_type:
		GameTypes.EnemyType.CHASER:
			max_hp = config.chaser_hp * hp_bonus
			move_speed = config.chaser_speed * speed_bonus
			damage = config.chaser_damage
			xp_value = 3
		GameTypes.EnemyType.SHOOTER:
			max_hp = config.shooter_hp * hp_bonus
			move_speed = config.shooter_speed * speed_bonus
			damage = config.shooter_damage
			xp_value = 5
			shoot_timer = randf_range(0.4, config.shooter_cooldown)
		GameTypes.EnemyType.GUARDIAN:
			max_hp = config.guardian_hp * hp_bonus
			move_speed = config.guardian_speed * speed_bonus
			damage = config.guardian_damage
			xp_value = 8
			orbit_angle = randf() * TAU
		GameTypes.EnemyType.SPAWNER:
			max_hp = config.spawner_hp * hp_bonus
			move_speed = config.spawner_speed * speed_bonus
			damage = config.spawner_damage
			xp_value = 7
			destination = game.pick_spawner_destination(self)
			destination_timer = config.spawner_destination_repick_time
			lay_timer = randf_range(config.spawner_lay_min_interval, config.spawner_lay_max_interval)
			life_timer = config.spawner_lifetime
	hp = max_hp
	_apply_visuals()

func _ready() -> void:
	collision_layer = COLLISION_LAYER_ENEMY
	collision_mask = COLLISION_LAYER_WORLD | COLLISION_LAYER_PLAYER | COLLISION_LAYER_ENEMY
	_create_collision()
	_create_visuals()

func _physics_process(delta: float) -> void:
	if not active or game == null or config == null or game.is_gameplay_paused():
		return
	var player = game.player
	if player == null:
		return
	contact_timer = maxf(0.0, contact_timer - delta)
	shoot_timer = maxf(0.0, shoot_timer - delta)
	if enemy_type == GameTypes.EnemyType.SPAWNER:
		life_timer -= delta
		if life_timer <= 0.0:
			_self_destruct()
			return
		_update_spawner_timers(delta)
	var to_player: Vector3 = player.global_position - global_position
	to_player.y = 0.0
	var distance_to_player: float = to_player.length()
	var desired: Vector3 = _movement_direction(to_player, distance_to_player, delta)
	desired += _separation_direction() * config.separation_strength
	if desired.length_squared() > 0.01:
		velocity = desired.normalized() * move_speed + knockback_velocity
	else:
		velocity = knockback_velocity
	knockback_velocity = knockback_velocity.move_toward(Vector3.ZERO, delta * 18.0)
	move_and_slide()
	global_position.y = 0.65
	_clamp_to_map()
	if velocity.length_squared() > 0.02:
		mesh_instance.look_at(global_position + velocity, Vector3.UP)
	_handle_attacks(player, to_player, distance_to_player)

func _create_collision() -> void:
	collision_shape = CollisionShape3D.new()
	var shape: CapsuleShape3D = CapsuleShape3D.new()
	shape.radius = 0.42
	shape.height = 1.2
	collision_shape.shape = shape
	add_child(collision_shape)

func _create_visuals() -> void:
	mesh_instance = MeshInstance3D.new()
	var mesh: CapsuleMesh = CapsuleMesh.new()
	mesh.radius = 0.42
	mesh.height = 1.1
	mesh.radial_segments = 18
	mesh.rings = 8
	mesh_instance.mesh = mesh
	mesh_instance.position.y = 0.55
	add_child(mesh_instance)
	asset_model = _instantiate_enemy_asset()
	if asset_model != null:
		mesh_instance.mesh = null
		mesh_instance.add_child(asset_model)

	head_mesh = MeshInstance3D.new()
	var head: SphereMesh = SphereMesh.new()
	head.radius = 0.34
	head.height = 0.48
	head.radial_segments = 18
	head.rings = 8
	head_mesh.mesh = head
	head_mesh.position = Vector3(0.0, 0.1, -0.38)
	mesh_instance.add_child(head_mesh)

	eye_mesh = MeshInstance3D.new()
	var eye: SphereMesh = SphereMesh.new()
	eye.radius = 0.13
	eye.height = 0.18
	eye.radial_segments = 12
	eye.rings = 6
	eye_mesh.mesh = eye
	eye_mesh.position = Vector3(0.0, 0.16, -0.68)
	mesh_instance.add_child(eye_mesh)

	barrel_mesh = MeshInstance3D.new()
	var barrel: CylinderMesh = CylinderMesh.new()
	barrel.bottom_radius = 0.11
	barrel.top_radius = 0.08
	barrel.height = 0.72
	barrel.radial_segments = 12
	barrel_mesh.mesh = barrel
	barrel_mesh.position = Vector3(0.0, 0.08, -0.78)
	barrel_mesh.rotation.x = deg_to_rad(90.0)
	mesh_instance.add_child(barrel_mesh)

	left_fin_mesh = _create_fin_mesh(-1.0)
	right_fin_mesh = _create_fin_mesh(1.0)
	mesh_instance.add_child(left_fin_mesh)
	mesh_instance.add_child(right_fin_mesh)

	armor_ring_mesh = MeshInstance3D.new()
	var armor: TorusMesh = TorusMesh.new()
	armor.inner_radius = 0.42
	armor.outer_radius = 0.5
	armor.ring_segments = 36
	armor.rings = 6
	armor_ring_mesh.mesh = armor
	armor_ring_mesh.rotation.x = deg_to_rad(90.0)
	armor_ring_mesh.position.y = 0.02
	mesh_instance.add_child(armor_ring_mesh)

	sac_mesh = MeshInstance3D.new()
	var sac: SphereMesh = SphereMesh.new()
	sac.radius = 0.32
	sac.height = 0.46
	sac.radial_segments = 16
	sac.rings = 8
	sac_mesh.mesh = sac
	sac_mesh.position = Vector3(0.0, -0.22, 0.42)
	mesh_instance.add_child(sac_mesh)

	core_light = OmniLight3D.new()
	core_light.position = Vector3(0.0, 0.12, -0.3)
	core_light.omni_range = 3.2
	core_light.light_energy = 0.35
	mesh_instance.add_child(core_light)
	_apply_visuals()

func _instantiate_enemy_asset() -> Node3D:
	var scene: PackedScene = load(_get_enemy_asset_path()) as PackedScene
	if scene == null:
		return null
	var root: Node3D = scene.instantiate() as Node3D
	if root == null:
		return null
	root.name = "KenneyEnemyModel"
	root.rotation.y = PI
	root.scale = Vector3.ONE * _get_enemy_asset_scale()
	return root

func _get_enemy_asset_path() -> String:
	match enemy_type:
		GameTypes.EnemyType.CHASER:
			return KENNEY_ZOMBIE_PATH
		GameTypes.EnemyType.SHOOTER:
			return KENNEY_GHOST_PATH
		GameTypes.EnemyType.GUARDIAN:
			return KENNEY_SKELETON_PATH
		GameTypes.EnemyType.SPAWNER:
			return KENNEY_VAMPIRE_PATH
	return KENNEY_ZOMBIE_PATH

func _get_enemy_asset_scale() -> float:
	match enemy_type:
		GameTypes.EnemyType.GUARDIAN:
			return 1.05
		GameTypes.EnemyType.SPAWNER:
			return 0.86
		_:
			return 0.82

func _create_fin_mesh(side: float) -> MeshInstance3D:
	var fin: MeshInstance3D = MeshInstance3D.new()
	var mesh: PrismMesh = PrismMesh.new()
	mesh.size = Vector3(0.26, 0.72, 0.18)
	fin.mesh = mesh
	fin.position = Vector3(0.42 * side, 0.06, 0.08)
	fin.rotation = Vector3(deg_to_rad(18.0), 0.0, deg_to_rad(34.0 * side))
	return fin

func _apply_visuals() -> void:
	if mesh_instance == null:
		return
	var color: Color = Color(0.75, 0.18, 0.12)
	var emission: Color = Color(0.7, 0.08, 0.03)
	var accent: Color = Color(1.0, 0.45, 0.24)
	var eye_color: Color = Color(1.0, 0.85, 0.35)
	match enemy_type:
		GameTypes.EnemyType.CHASER:
			color = Color(0.76, 0.2, 0.12)
			emission = Color(0.55, 0.08, 0.03)
			accent = Color(1.0, 0.36, 0.18)
			eye_color = Color(1.0, 0.9, 0.35)
			mesh_instance.scale = Vector3(1.0, 1.0, 1.0)
		GameTypes.EnemyType.SHOOTER:
			color = Color(0.55, 0.25, 0.86)
			emission = Color(0.42, 0.12, 0.75)
			accent = Color(0.88, 0.55, 1.0)
			eye_color = Color(0.7, 0.95, 1.0)
			mesh_instance.scale = Vector3(0.95, 0.98, 0.95)
		GameTypes.EnemyType.GUARDIAN:
			color = Color(0.46, 0.09, 0.09)
			emission = Color(0.85, 0.05, 0.03)
			accent = Color(0.96, 0.16, 0.08)
			eye_color = Color(1.0, 0.2, 0.08)
			mesh_instance.scale = Vector3(1.45, 1.35, 1.45)
		GameTypes.EnemyType.SPAWNER:
			color = Color(0.96, 0.74, 0.18)
			emission = Color(0.25, 0.95, 1.0)
			accent = Color(0.23, 0.96, 1.0)
			eye_color = Color(0.25, 1.0, 0.95)
			mesh_instance.scale = Vector3(1.15, 1.48, 1.15)
	var using_asset_model: bool = asset_model != null
	mesh_instance.material_override = null if using_asset_model else _make_enemy_material(color, emission, 0.55)
	if head_mesh != null:
		head_mesh.material_override = _make_enemy_material(color.lightened(0.12), emission, 0.45)
		head_mesh.visible = not using_asset_model and enemy_type != GameTypes.EnemyType.GUARDIAN
	if eye_mesh != null:
		eye_mesh.visible = not using_asset_model
		eye_mesh.material_override = _make_enemy_material(eye_color, eye_color, 1.8)
	if barrel_mesh != null:
		barrel_mesh.visible = not using_asset_model and enemy_type == GameTypes.EnemyType.SHOOTER
		barrel_mesh.material_override = _make_enemy_material(accent, emission, 1.0)
	if left_fin_mesh != null and right_fin_mesh != null:
		var show_fins: bool = not using_asset_model and enemy_type == GameTypes.EnemyType.SPAWNER
		left_fin_mesh.visible = show_fins
		right_fin_mesh.visible = show_fins
		left_fin_mesh.material_override = _make_enemy_material(accent, emission, 1.2)
		right_fin_mesh.material_override = left_fin_mesh.material_override
	if armor_ring_mesh != null:
		armor_ring_mesh.visible = not using_asset_model and enemy_type == GameTypes.EnemyType.GUARDIAN
		armor_ring_mesh.material_override = _make_enemy_material(accent, emission, 1.4)
	if sac_mesh != null:
		sac_mesh.visible = not using_asset_model and enemy_type == GameTypes.EnemyType.SPAWNER
		sac_mesh.material_override = _make_enemy_material(Color(0.72, 1.0, 0.35), Color(0.28, 1.0, 0.5), 1.4)
	if core_light != null:
		core_light.light_color = emission
		core_light.light_energy = 0.75 if enemy_type == GameTypes.EnemyType.SPAWNER else 0.35

func _make_enemy_material(albedo: Color, emission: Color, emission_energy: float) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = albedo
	material.roughness = 0.58
	material.emission_enabled = true
	material.emission = emission
	material.emission_energy_multiplier = emission_energy
	return material

func _movement_direction(to_player: Vector3, distance_to_player: float, delta: float) -> Vector3:
	if distance_to_player <= 0.01:
		return Vector3.ZERO
	var player_dir: Vector3 = to_player / distance_to_player
	match enemy_type:
		GameTypes.EnemyType.CHASER:
			return player_dir
		GameTypes.EnemyType.SHOOTER:
			if distance_to_player < config.shooter_keep_distance:
				return -player_dir
			if distance_to_player > config.shooter_range * 0.9:
				return player_dir
			return Vector3(-player_dir.z, 0.0, player_dir.x) * 0.45
		GameTypes.EnemyType.GUARDIAN:
			if distance_to_player < config.guardian_leash_radius:
				return player_dir
			if guard_target != null and is_instance_valid(guard_target):
				var to_egg: Vector3 = guard_target.global_position - global_position
				to_egg.y = 0.0
				var dist_to_egg: float = to_egg.length()
				orbit_angle += delta * 0.8
				var orbit: Vector3 = Vector3(cos(orbit_angle), 0.0, sin(orbit_angle))
				if dist_to_egg > 4.0:
					return to_egg.normalized() + orbit * 0.25
				return orbit
			return player_dir
		GameTypes.EnemyType.SPAWNER:
			if distance_to_player < config.spawner_flee_radius:
				return -player_dir
			var to_destination: Vector3 = destination - global_position
			to_destination.y = 0.0
			if to_destination.length() <= config.spawner_destination_arrive_radius or destination_timer <= 0.0:
				destination = game.pick_spawner_destination(self)
				destination_timer = config.spawner_destination_repick_time
				to_destination = destination - global_position
				to_destination.y = 0.0
			if to_destination.length_squared() <= 0.01:
				return Vector3.ZERO
			return to_destination.normalized()
	return player_dir

func _update_spawner_timers(delta: float) -> void:
	destination_timer -= delta
	lay_timer -= delta
	if lay_timer > 0.0:
		return
	if game.try_spawner_lay_egg(self):
		lay_timer = randf_range(config.spawner_lay_min_interval, config.spawner_lay_max_interval)
	else:
		lay_timer = randf_range(config.spawner_lay_min_interval * 0.5, config.spawner_lay_min_interval)
		destination = game.pick_spawner_destination(self)
		destination_timer = config.spawner_destination_repick_time

func _separation_direction() -> Vector3:
	var result: Vector3 = Vector3.ZERO
	var nearby: Array = game.get_nearby_enemies(global_position, config.separation_radius)
	for other in nearby:
		if other == self or other == null or not other.active:
			continue
		var away: Vector3 = global_position - other.global_position
		away.y = 0.0
		var distance_sq: float = maxf(away.length_squared(), 0.05)
		result += away.normalized() / distance_sq
	return result

func _handle_attacks(player, to_player: Vector3, distance_to_player: float) -> void:
	if distance_to_player <= 1.15 and contact_timer <= 0.0 and player.can_receive_contact_damage():
		player.take_damage(damage)
		contact_timer = config.contact_damage_interval
	if enemy_type == GameTypes.EnemyType.SHOOTER and distance_to_player <= config.shooter_range and shoot_timer <= 0.0:
		shoot_timer = config.shooter_cooldown
		if to_player.length_squared() > 0.01:
			game.fire_enemy_projectile(global_position + Vector3(0.0, 0.55, 0.0), to_player.normalized(), damage)

func take_damage(amount: float) -> void:
	if not active:
		return
	hp -= amount
	if mesh_instance != null:
		mesh_instance.scale *= 1.04
	if hp <= 0.0:
		active = false
		if game != null:
			game.on_enemy_killed(self, xp_value)

func apply_knockback(origin: Vector3, force: float) -> void:
	var away: Vector3 = global_position - origin
	away.y = 0.0
	if away.length_squared() <= 0.01:
		away = Vector3(randf_range(-1.0, 1.0), 0.0, randf_range(-1.0, 1.0))
	knockback_velocity += away.normalized() * force

func _self_destruct() -> void:
	if not active:
		return
	active = false
	if game != null:
		game.on_enemy_expired(self)

func _clamp_to_map() -> void:
	var flat: Vector2 = Vector2(global_position.x, global_position.z)
	var radius: float = game.get_map_radius() + 2.0
	if flat.length() > radius:
		flat = flat.normalized() * radius
		global_position.x = flat.x
		global_position.z = flat.y
