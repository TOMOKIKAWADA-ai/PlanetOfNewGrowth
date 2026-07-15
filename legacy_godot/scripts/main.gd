extends Node3D
class_name GameMain

const PLAYER_SCENE: PackedScene = preload("res://scenes/Player.tscn")
const CAMERA_RIG_SCENE: PackedScene = preload("res://scenes/CameraRig.tscn")
const EGG_SCENE: PackedScene = preload("res://scenes/Egg.tscn")
const MOTHER_EGG_SCENE: PackedScene = preload("res://scenes/MotherEgg.tscn")
const ENEMY_SCENE: PackedScene = preload("res://scenes/EnemyBase.tscn")
const PROJECTILE_SCENE: PackedScene = preload("res://scenes/Projectile.tscn")
const ORB_SCENE: PackedScene = preload("res://scenes/ExperienceOrb.tscn")
const HUD_SCENE: PackedScene = preload("res://scenes/HUD.tscn")
const LEVEL_UP_SCENE: PackedScene = preload("res://scenes/LevelUpScreen.tscn")
const RESULT_SCENE: PackedScene = preload("res://scenes/ResultScreen.tscn")
const GameConfigScript = preload("res://scripts/config/game_config.gd")
const GameTypes = preload("res://scripts/game_types.gd")
const KENNEY_TREE_PATHS: Array = [
	"res://assets/kenney/nature/tree_pineTallA.glb",
	"res://assets/kenney/nature/tree_pineTallB.glb",
	"res://assets/kenney/nature/tree_oak.glb",
	"res://assets/kenney/nature/tree_default.glb"
]
const KENNEY_ROCK_PATHS: Array = [
	"res://assets/kenney/nature/rock_smallA.glb",
	"res://assets/kenney/nature/rock_smallB.glb",
	"res://assets/kenney/nature/rock_largeA.glb"
]
const KENNEY_GRASS_PATHS: Array = [
	"res://assets/kenney/nature/grass.glb",
	"res://assets/kenney/nature/grass_large.glb",
	"res://assets/kenney/nature/plant_bush.glb"
]

var config: Resource = GameConfigScript.new()
var rng: RandomNumberGenerator = RandomNumberGenerator.new()

var player
var camera_rig
var hud
var level_screen
var result_screen

var eggs: Array = []
var enemies: Array = []
var projectile_pool: Array = []
var orb_pool: Array = []
var enemy_grid: Dictionary = {}

var play_time: float = 0.0
var gameplay_paused: bool = false
var level_up_open: bool = false
var result_finished: bool = false
var victory: bool = false
var mother_spawned: bool = false
var mother_egg
var debug_visible: bool = false
var egg_resurgence_timer: float = 0.0
var burst_audio_player: AudioStreamPlayer

func _ready() -> void:
	rng.randomize()
	process_mode = Node.PROCESS_MODE_ALWAYS
	egg_resurgence_timer = config.egg_resurgence_delay
	_setup_world()
	_setup_audio()
	_setup_pools()
	_spawn_player_and_camera()
	_spawn_ui()
	_spawn_initial_eggs()
	_update_enemy_grid()

func _physics_process(delta: float) -> void:
	if result_finished:
		_update_hud()
		return
	if not gameplay_paused:
		play_time += delta
		if play_time >= config.mother_egg_time and not mother_spawned:
			_spawn_mother_egg()
		if play_time >= config.game_duration and not result_finished:
			lose_game("時間内に母卵を破壊できませんでした")
		_handle_egg_resurgence(delta)
		_update_enemy_grid()
	_update_hud()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey:
		var key_event: InputEventKey = event as InputEventKey
		if not key_event.pressed or key_event.echo:
			return
		match key_event.keycode:
			KEY_ESCAPE:
				if not result_finished and not level_up_open:
					gameplay_paused = not gameplay_paused
			KEY_R:
				_restart()
			KEY_F3:
				debug_visible = not debug_visible
				if hud != null:
					hud.set_debug_enabled(debug_visible)

func _setup_world() -> void:
	var environment_node: WorldEnvironment = WorldEnvironment.new()
	var environment: Environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.045, 0.06, 0.05)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.48, 0.54, 0.47)
	environment.ambient_light_energy = 0.85
	environment.glow_enabled = true
	environment.glow_intensity = 0.35
	environment_node.environment = environment
	add_child(environment_node)

	var sun: DirectionalLight3D = DirectionalLight3D.new()
	sun.light_energy = 2.5
	sun.rotation_degrees = Vector3(-50.0, 35.0, 0.0)
	add_child(sun)

	var floor_mesh: MeshInstance3D = MeshInstance3D.new()
	floor_mesh.name = "Ground"
	var plane: PlaneMesh = PlaneMesh.new()
	plane.size = Vector2(config.map_radius * 2.5, config.map_radius * 2.5)
	floor_mesh.mesh = plane
	var floor_material: StandardMaterial3D = StandardMaterial3D.new()
	floor_material.albedo_color = Color(0.17, 0.26, 0.17)
	floor_material.roughness = 0.92
	floor_mesh.material_override = floor_material
	add_child(floor_mesh)

	_create_multimesh_ground_cover()

func _setup_audio() -> void:
	burst_audio_player = AudioStreamPlayer.new()
	var stream: AudioStreamGenerator = AudioStreamGenerator.new()
	stream.mix_rate = 22050.0
	stream.buffer_length = 0.18
	burst_audio_player.stream = stream
	add_child(burst_audio_player)

func _create_multimesh_ground_cover() -> void:
	if not _create_multimesh_from_asset_paths("KenneyGrass", KENNEY_GRASS_PATHS, 900, 0.65, 1.55, false):
		var grass_mesh: BoxMesh = BoxMesh.new()
		grass_mesh.size = Vector3(0.08, 0.45, 0.08)
		var grass_material: StandardMaterial3D = StandardMaterial3D.new()
		grass_material.albedo_color = Color(0.23, 0.44, 0.19)
		grass_mesh.material = grass_material
		_create_multimesh("Grass", grass_mesh, 900, 0.5, 1.4)

	if not _create_multimesh_from_asset_paths("KenneyStones", KENNEY_ROCK_PATHS, 130, 0.7, 1.9, false):
		var stone_mesh: BoxMesh = BoxMesh.new()
		stone_mesh.size = Vector3(0.55, 0.22, 0.45)
		var stone_material: StandardMaterial3D = StandardMaterial3D.new()
		stone_material.albedo_color = Color(0.34, 0.36, 0.33)
		stone_mesh.material = stone_material
		_create_multimesh("Stones", stone_mesh, 120, 0.5, 1.8)

	if not _create_multimesh_from_asset_paths("KenneyDistantTrees", KENNEY_TREE_PATHS, 95, 1.0, 1.9, true):
		_create_distant_tree_assets()

func _create_multimesh_from_asset_paths(prefix: String, paths: Array, count: int, min_scale: float, max_scale: float, outer_only: bool) -> bool:
	var meshes: Array[Mesh] = []
	for path in paths:
		var mesh: Mesh = _load_mesh_from_scene(str(path))
		if mesh != null:
			meshes.append(mesh)
	if meshes.is_empty():
		return false
	var per_mesh_count: int = maxi(1, int(ceil(float(count) / float(meshes.size()))))
	for i in range(meshes.size()):
		_create_multimesh("%s%d" % [prefix, i], meshes[i], per_mesh_count, min_scale, max_scale, outer_only)
	return true

func _load_mesh_from_scene(path: String) -> Mesh:
	var scene: PackedScene = load(path) as PackedScene
	if scene == null:
		return null
	var root: Node = scene.instantiate()
	var mesh: Mesh = null
	if root is MeshInstance3D:
		mesh = (root as MeshInstance3D).mesh
	if mesh == null:
		var mesh_nodes: Array = root.find_children("*", "MeshInstance3D", true, false)
		for node in mesh_nodes:
			var mesh_instance: MeshInstance3D = node as MeshInstance3D
			if mesh_instance != null and mesh_instance.mesh != null:
				mesh = mesh_instance.mesh
				break
	root.free()
	return mesh

func _create_distant_tree_assets() -> void:
	var count: int = 95
	var positions: Array[Vector3] = []
	var yaws: Array[float] = []
	var scales: Array[float] = []
	for i in range(count):
		positions.append(_random_ground_position(config.map_radius * 0.68, config.map_radius * 1.12))
		yaws.append(rng.randf_range(0.0, TAU))
		scales.append(rng.randf_range(0.9, 1.85))

	var trunk_mesh: CylinderMesh = CylinderMesh.new()
	trunk_mesh.bottom_radius = 0.18
	trunk_mesh.top_radius = 0.12
	trunk_mesh.height = 2.15
	trunk_mesh.radial_segments = 9
	trunk_mesh.material = _make_world_material(Color(0.32, 0.2, 0.12), Color(0.04, 0.03, 0.01), 0.05)
	_create_layered_multimesh("DistantTreeTrunks", trunk_mesh, positions, yaws, scales, Vector3(0.9, 1.0, 0.9), 1.05)

	var crown_mesh: SphereMesh = SphereMesh.new()
	crown_mesh.radius = 0.82
	crown_mesh.height = 1.3
	crown_mesh.radial_segments = 18
	crown_mesh.rings = 9
	crown_mesh.material = _make_world_material(Color(0.09, 0.31, 0.15), Color(0.02, 0.09, 0.04), 0.12)
	_create_layered_multimesh("DistantTreeCrowns", crown_mesh, positions, yaws, scales, Vector3(1.25, 0.85, 1.25), 2.35)

	var crown_top_mesh: SphereMesh = SphereMesh.new()
	crown_top_mesh.radius = 0.52
	crown_top_mesh.height = 0.86
	crown_top_mesh.radial_segments = 16
	crown_top_mesh.rings = 8
	crown_top_mesh.material = _make_world_material(Color(0.15, 0.43, 0.18), Color(0.03, 0.14, 0.04), 0.16)
	_create_layered_multimesh("DistantTreeCrownHighlights", crown_top_mesh, positions, yaws, scales, Vector3(0.95, 0.65, 0.95), 2.85)

func _create_layered_multimesh(
	name: String,
	mesh: Mesh,
	positions: Array[Vector3],
	yaws: Array[float],
	scales: Array[float],
	shape_scale: Vector3,
	height_offset: float
) -> void:
	var instance: MultiMeshInstance3D = MultiMeshInstance3D.new()
	instance.name = name
	var multimesh: MultiMesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.mesh = mesh
	multimesh.instance_count = positions.size()
	for i in range(positions.size()):
		var scale_value: float = scales[i]
		var basis: Basis = Basis(Vector3.UP, yaws[i]).scaled(shape_scale * scale_value)
		var position: Vector3 = positions[i] + Vector3(0.0, height_offset * scale_value, 0.0)
		multimesh.set_instance_transform(i, Transform3D(basis, position))
	instance.multimesh = multimesh
	add_child(instance)

func _make_world_material(albedo: Color, emission: Color, emission_energy: float) -> StandardMaterial3D:
	var material: StandardMaterial3D = StandardMaterial3D.new()
	material.albedo_color = albedo
	material.roughness = 0.85
	if emission_energy > 0.0:
		material.emission_enabled = true
		material.emission = emission
		material.emission_energy_multiplier = emission_energy
	return material

func _create_multimesh(name: String, mesh: Mesh, count: int, min_scale: float, max_scale: float, outer_only: bool = false) -> void:
	var instance: MultiMeshInstance3D = MultiMeshInstance3D.new()
	instance.name = name
	var multimesh: MultiMesh = MultiMesh.new()
	multimesh.transform_format = MultiMesh.TRANSFORM_3D
	multimesh.mesh = mesh
	multimesh.instance_count = count
	for i in range(count):
		var radius_min: float = config.map_radius * 0.68 if outer_only else 4.0
		var radius_max: float = config.map_radius * 1.12 if outer_only else config.map_radius * 0.98
		var position: Vector3 = _random_ground_position(radius_min, radius_max)
		var scale_value: float = rng.randf_range(min_scale, max_scale)
		var basis: Basis = Basis(Vector3.UP, rng.randf_range(0.0, TAU)).scaled(Vector3.ONE * scale_value)
		multimesh.set_instance_transform(i, Transform3D(basis, position))
	instance.multimesh = multimesh
	add_child(instance)

func _setup_pools() -> void:
	for i in range(170):
		var projectile = PROJECTILE_SCENE.instantiate()
		add_child(projectile)
		projectile.setup_pool(self, config)
		projectile_pool.append(projectile)
	for i in range(240):
		var orb = ORB_SCENE.instantiate()
		add_child(orb)
		orb.setup_pool(self, config)
		orb_pool.append(orb)

func _spawn_player_and_camera() -> void:
	player = PLAYER_SCENE.instantiate()
	add_child(player)
	player.global_position = Vector3.ZERO
	player.configure(self, config)

	camera_rig = CAMERA_RIG_SCENE.instantiate()
	add_child(camera_rig)
	camera_rig.set_follow_target(player)

func _spawn_ui() -> void:
	hud = HUD_SCENE.instantiate()
	add_child(hud)
	hud.set_debug_enabled(debug_visible)

	level_screen = LEVEL_UP_SCENE.instantiate()
	add_child(level_screen)
	level_screen.upgrade_chosen.connect(_on_upgrade_chosen)

	result_screen = RESULT_SCENE.instantiate()
	add_child(result_screen)
	result_screen.restart_requested.connect(_restart)

func _spawn_initial_eggs() -> void:
	for i in range(config.initial_egg_count):
		var angle: float = TAU * float(i) / float(config.initial_egg_count) + rng.randf_range(-0.3, 0.3)
		var distance: float = rng.randf_range(15.0, 26.0)
		var position: Vector3 = Vector3(cos(angle) * distance, 0.0, sin(angle) * distance)
		spawn_egg(position, rng.randf_range(0.0, config.egg_mature_time * 0.55))

func spawn_egg(position: Vector3, start_age: float = 0.0):
	if eggs.size() >= config.max_eggs:
		return null
	var egg = EGG_SCENE.instantiate()
	add_child(egg)
	egg.global_position = _clamp_to_ground(position)
	egg.configure(self, config, start_age)
	eggs.append(egg)
	return egg

func request_hatch(parent_egg) -> void:
	if parent_egg == null or not is_instance_valid(parent_egg):
		return
	var enemy_type: int = _roll_enemy_type()
	var offset: Vector3 = _random_ring_offset(1.6, 3.0)
	spawn_enemy(enemy_type, parent_egg.global_position + offset, parent_egg)

func get_egg_hatch_speed_multiplier() -> float:
	var progress: float = clampf(play_time / maxf(config.game_duration, 1.0), 0.0, 1.0)
	var eased: float = smoothstep(0.0, 1.0, progress)
	return lerpf(1.0, config.egg_hatch_late_speed_multiplier, eased)

func request_spawn_child_egg(parent_egg) -> void:
	if parent_egg == null or not is_instance_valid(parent_egg):
		return
	var position: Vector3 = _find_child_egg_position(parent_egg.global_position)
	spawn_egg(position, 0.0)

func _handle_egg_resurgence(delta: float) -> void:
	if mother_spawned or eggs.size() > 0:
		egg_resurgence_timer = config.egg_resurgence_delay
		return
	egg_resurgence_timer -= delta
	if egg_resurgence_timer > 0.0:
		return
	_spawn_resurgence_pair()
	egg_resurgence_timer = config.egg_resurgence_delay

func _spawn_resurgence_pair() -> void:
	if mother_spawned or eggs.size() > 0:
		return
	var position: Vector3 = _find_resurgence_egg_position()
	var egg = spawn_egg(position, config.egg_mature_time)
	if egg != null:
		spawn_enemy(GameTypes.EnemyType.SPAWNER, position + _random_ring_offset(2.0, 3.5), egg)

func spawn_enemy(enemy_type: int, position: Vector3, guard_target = null):
	if enemies.size() >= config.max_enemies:
		return null
	var enemy = ENEMY_SCENE.instantiate()
	add_child(enemy)
	enemy.setup(self, config, enemy_type, _clamp_to_ground(position), guard_target)
	enemies.append(enemy)
	return enemy

func pick_spawner_destination(spawner) -> Vector3:
	var best_position: Vector3 = _random_ground_position(8.0, config.map_radius * 0.9)
	var best_score: float = INF
	for i in range(config.spawner_destination_candidates):
		var candidate: Vector3 = _random_ground_position(8.0, config.map_radius * 0.92)
		var score: float = float(_count_eggs_near(candidate, config.spawner_destination_density_radius)) * 2.0
		if player != null:
			var player_distance: float = candidate.distance_to(player.global_position)
			if player_distance < config.spawner_flee_radius * 1.5:
				score += 5.0
		for enemy in enemies:
			if enemy == null or enemy == spawner or not enemy.active:
				continue
			if enemy.enemy_type != GameTypes.EnemyType.SPAWNER:
				continue
			var spread_anchor: Vector3 = enemy.destination if enemy.destination != Vector3.ZERO else enemy.global_position
			if spread_anchor.distance_squared_to(candidate) < config.spawner_destination_spread_radius * config.spawner_destination_spread_radius:
				score += 4.0
		score += rng.randf_range(0.0, 1.0)
		if score < best_score:
			best_score = score
			best_position = candidate
	return _clamp_to_ground(best_position)

func try_spawner_lay_egg(spawner) -> bool:
	if spawner == null or not is_instance_valid(spawner):
		return false
	if eggs.size() >= config.max_eggs:
		return false
	if _count_eggs_near(spawner.global_position, config.spawner_lay_nearby_radius) >= config.spawner_lay_nearby_limit:
		return false
	for i in range(8):
		var candidate: Vector3 = _clamp_to_ground(spawner.global_position + _random_ring_offset(2.5, 6.0))
		if _is_valid_spawner_egg_position(candidate):
			spawn_egg(candidate, 0.0)
			return true
	return false

func on_enemy_killed(enemy, xp_value: int) -> void:
	if enemy == null:
		return
	if player != null:
		var burst_gain: float = config.burst_gain_spawner if enemy.enemy_type == GameTypes.EnemyType.SPAWNER else config.burst_gain_enemy
		player.add_burst(burst_gain)
	enemies.erase(enemy)
	spawn_xp_orb(enemy.global_position, xp_value)
	enemy.queue_free()

func on_enemy_expired(enemy) -> void:
	if enemy == null:
		return
	enemies.erase(enemy)
	enemy.queue_free()

func on_egg_destroyed(egg) -> void:
	if egg == null:
		return
	eggs.erase(egg)
	if egg.is_mother:
		win_game()
	else:
		spawn_xp_orb(egg.global_position, config.egg_xp_value)
		if player != null:
			player.add_burst(config.burst_gain_egg)
			player.hp = minf(player.max_hp, player.hp + player.max_hp * config.egg_destroy_hp_restore_ratio)
		if eggs.is_empty() and not mother_spawned and not result_finished:
			_spawn_resurgence_pair()
	egg.queue_free()

func spawn_xp_orb(position: Vector3, amount: int) -> void:
	var orb = _get_free_orb()
	if orb != null:
		orb.spawn(position, amount)

func _get_free_orb():
	for orb in orb_pool:
		if not orb.active:
			return orb
	var extra = ORB_SCENE.instantiate()
	add_child(extra)
	extra.setup_pool(self, config)
	orb_pool.append(extra)
	return extra

func _get_free_projectile():
	for projectile in projectile_pool:
		if not projectile.active:
			return projectile
	var extra = PROJECTILE_SCENE.instantiate()
	add_child(extra)
	extra.setup_pool(self, config)
	projectile_pool.append(extra)
	return extra

func fire_player_projectiles(origin: Vector3, target: Vector3, damage: float, speed: float, count: int, pierce: int) -> void:
	var direction: Vector3 = target - origin
	direction.y = 0.0
	if direction.length_squared() <= 0.01:
		return
	direction = direction.normalized()
	var spread_step: float = deg_to_rad(10.0)
	var center_offset: float = float(count - 1) * 0.5
	for i in range(count):
		var angle: float = (float(i) - center_offset) * spread_step
		var rotated: Vector3 = Basis(Vector3.UP, angle) * direction
		var projectile = _get_free_projectile()
		projectile.launch(origin, rotated, speed, damage, true, pierce)

func fire_enemy_projectile(origin: Vector3, direction: Vector3, damage: float) -> void:
	var projectile = _get_free_projectile()
	projectile.launch(origin, direction, 12.0, damage, false, 0)

func perform_dive_attack(center: Vector3, radius: float, damage: float, egg_multiplier: float) -> void:
	var radius_sq: float = radius * radius
	for egg in eggs.duplicate():
		if egg != null and is_instance_valid(egg) and egg.global_position.distance_squared_to(center) <= radius_sq:
			egg.take_damage(damage * egg_multiplier)
	for enemy in enemies.duplicate():
		if enemy != null and is_instance_valid(enemy) and enemy.global_position.distance_squared_to(center) <= radius_sq:
			enemy.take_damage(damage)

func perform_human_melee(center: Vector3, forward: Vector3, range: float, arc: float, enemy_damage: float, egg_damage: float) -> void:
	var range_sq: float = range * range
	var facing: Vector3 = forward.normalized()
	var min_dot: float = cos(arc * 0.5)
	for egg in eggs.duplicate():
		if egg == null or not is_instance_valid(egg) or not egg.active:
			continue
		var to_egg: Vector3 = egg.global_position - center
		to_egg.y = 0.0
		if to_egg.length_squared() <= range_sq and _is_in_front_arc(to_egg, facing, min_dot):
			egg.take_damage(egg_damage)
	for enemy in enemies.duplicate():
		if enemy == null or not is_instance_valid(enemy) or not enemy.active:
			continue
		var to_enemy: Vector3 = enemy.global_position - center
		to_enemy.y = 0.0
		if to_enemy.length_squared() <= range_sq and _is_in_front_arc(to_enemy, facing, min_dot):
			enemy.take_damage(enemy_damage)

func perform_burst_attack(center: Vector3) -> void:
	var radius_sq: float = config.burst_radius * config.burst_radius
	for enemy in enemies.duplicate():
		if enemy == null or not is_instance_valid(enemy) or not enemy.active:
			continue
		if enemy.global_position.distance_squared_to(center) <= radius_sq:
			enemy.apply_knockback(center, config.burst_knockback_force)
			enemy.take_damage(config.burst_enemy_damage)
	for egg in eggs.duplicate():
		if egg == null or not is_instance_valid(egg) or not egg.active:
			continue
		if egg.global_position.distance_squared_to(center) <= radius_sq:
			var damage: float = minf(config.burst_egg_damage, config.burst_mother_egg_damage_cap) if egg.is_mother else config.burst_egg_damage
			egg.take_damage(damage)
	if camera_rig != null:
		camera_rig.shake(0.45, 0.6)
	_play_burst_sound()

func perform_area_pulse(center: Vector3, radius: float, damage: float, egg_damage_multiplier: float) -> void:
	var radius_sq: float = radius * radius
	for enemy in get_nearby_enemies(center, radius):
		if enemy == null or not is_instance_valid(enemy) or not enemy.active:
			continue
		enemy.take_damage(damage)
	for egg in eggs.duplicate():
		if egg == null or not is_instance_valid(egg) or not egg.active or egg.is_mother:
			continue
		if egg.global_position.distance_squared_to(center) <= radius_sq:
			egg.take_damage(damage * egg_damage_multiplier)

func _is_in_front_arc(to_target: Vector3, facing: Vector3, min_dot: float) -> bool:
	if to_target.length_squared() <= 0.01:
		return true
	return to_target.normalized().dot(facing) >= min_dot

func find_nearest_enemy(position: Vector3, radius: float):
	var nearest = null
	var best_distance: float = radius * radius
	var nearby: Array = get_nearby_enemies(position, radius)
	for enemy in nearby:
		if enemy == null or not enemy.active:
			continue
		var distance_sq: float = enemy.global_position.distance_squared_to(position)
		if distance_sq < best_distance:
			best_distance = distance_sq
			nearest = enemy
	return nearest

func find_nearest_egg(position: Vector3, radius: float, include_mother: bool, require_unclaimed: bool, claimant = null):
	var nearest = null
	var best_distance: float = radius * radius
	for egg in eggs:
		if egg == null or not is_instance_valid(egg) or not egg.active:
			continue
		if egg.is_mother and not include_mother:
			continue
		if require_unclaimed and not egg.can_be_predated_by(claimant):
			continue
		var distance_sq: float = _flat_distance_squared(egg.global_position, position)
		if distance_sq < best_distance:
			best_distance = distance_sq
			nearest = egg
	return nearest

func find_predation_egg(position: Vector3, radius: float, claimant):
	return find_nearest_egg(position, radius, false, true, claimant)

func find_mother_dive_target(position: Vector3, radius: float):
	if mother_egg == null or not is_instance_valid(mother_egg) or not mother_egg.active:
		return null
	var radius_sq: float = radius * radius
	if _flat_distance_squared(mother_egg.global_position, position) > radius_sq:
		return null
	return mother_egg

func find_human_auto_target(position: Vector3, enemy_radius: float, egg_priority_radius: float):
	var egg = find_nearest_egg(position, egg_priority_radius, true, false)
	if egg != null:
		return egg
	return find_nearest_enemy(position, enemy_radius)

func get_projectile_enemy_hit(position: Vector3, radius: float, ignored: Dictionary):
	var candidates: Array = get_nearby_enemies(position, radius + 0.8)
	for enemy in candidates:
		if enemy == null or not enemy.active:
			continue
		if ignored.has(enemy.get_instance_id()):
			continue
		if _flat_distance_squared(enemy.global_position, position) <= (radius + 0.55) * (radius + 0.55):
			return enemy
	return null

func get_projectile_player_hit(position: Vector3, radius: float, ignored: Dictionary):
	var enemy = get_projectile_enemy_hit(position, radius, ignored)
	var egg = get_projectile_egg_hit(position, radius, ignored)
	if enemy == null:
		return egg
	if egg == null:
		return enemy
	var enemy_distance: float = _flat_distance_squared(enemy.global_position, position)
	var egg_distance: float = _flat_distance_squared(egg.global_position, position)
	return egg if egg_distance < enemy_distance else enemy

func get_projectile_egg_hit(position: Vector3, radius: float, ignored: Dictionary):
	var hit_radius_sq: float = (radius + 0.75) * (radius + 0.75)
	for egg in eggs:
		if egg == null or not is_instance_valid(egg) or not egg.active:
			continue
		if ignored.has(egg.get_instance_id()):
			continue
		if _flat_distance_squared(egg.global_position, position) <= hit_radius_sq:
			return egg
	return null

func _flat_distance_squared(a: Vector3, b: Vector3) -> float:
	var dx: float = a.x - b.x
	var dz: float = a.z - b.z
	return dx * dx + dz * dz

func get_nearby_enemies(position: Vector3, radius: float) -> Array:
	var result: Array = []
	var cell_radius: int = ceili(radius / config.grid_cell_size)
	var center: Vector2i = _grid_cell(position)
	var radius_sq: float = radius * radius
	for x in range(center.x - cell_radius, center.x + cell_radius + 1):
		for y in range(center.y - cell_radius, center.y + cell_radius + 1):
			var key: Vector2i = Vector2i(x, y)
			if not enemy_grid.has(key):
				continue
			var bucket: Array = enemy_grid[key]
			for enemy in bucket:
				if enemy != null and enemy.active and enemy.global_position.distance_squared_to(position) <= radius_sq:
					result.append(enemy)
	return result

func _update_enemy_grid() -> void:
	enemy_grid.clear()
	for enemy in enemies:
		if enemy == null or not enemy.active:
			continue
		var key: Vector2i = _grid_cell(enemy.global_position)
		if not enemy_grid.has(key):
			enemy_grid[key] = []
		enemy_grid[key].append(enemy)

func _grid_cell(position: Vector3) -> Vector2i:
	return Vector2i(floori(position.x / config.grid_cell_size), floori(position.z / config.grid_cell_size))

func _roll_enemy_type() -> int:
	var roll: float = rng.randf()
	var egg_ratio: float = clampf(float(eggs.size()) / maxf(float(config.max_eggs), 1.0), 0.0, 1.0)
	var spawner_chance: float = lerpf(config.spawner_hatch_chance_low_eggs, config.spawner_hatch_chance_high_eggs, egg_ratio)
	if roll < spawner_chance:
		return GameTypes.EnemyType.SPAWNER
	var adjusted_roll: float = (roll - spawner_chance) / maxf(1.0 - spawner_chance, 0.001)
	if adjusted_roll < 0.56:
		return GameTypes.EnemyType.CHASER
	if adjusted_roll < 0.82:
		return GameTypes.EnemyType.SHOOTER
	return GameTypes.EnemyType.GUARDIAN

func _find_child_egg_position(parent_position: Vector3) -> Vector3:
	for i in range(14):
		var candidate: Vector3 = parent_position + _random_ring_offset(config.egg_spread_min_distance, config.egg_spread_max_distance)
		candidate = _clamp_to_ground(candidate)
		var valid: bool = true
		for egg in eggs:
			if egg != null and is_instance_valid(egg) and egg.global_position.distance_squared_to(candidate) < 2.8 * 2.8:
				valid = false
				break
		if valid:
			return candidate
	return _clamp_to_ground(parent_position + _random_ring_offset(config.egg_spread_min_distance, config.egg_spread_max_distance))

func _find_resurgence_egg_position() -> Vector3:
	var min_distance_sq: float = config.egg_resurgence_min_player_distance * config.egg_resurgence_min_player_distance
	for i in range(18):
		var candidate: Vector3 = _random_ground_position(config.map_radius * 0.55, config.map_radius * 0.95)
		if player == null or candidate.distance_squared_to(player.global_position) >= min_distance_sq:
			return candidate
	if player == null:
		return _random_ground_position(config.map_radius * 0.55, config.map_radius * 0.95)
	var away: Vector2 = Vector2(player.global_position.x, player.global_position.z)
	if away.length_squared() <= 0.01:
		away = Vector2.RIGHT
	away = -away.normalized().rotated(rng.randf_range(-0.7, 0.7))
	return Vector3(away.x, 0.0, away.y) * (config.map_radius * 0.78)

func _count_eggs_near(position: Vector3, radius: float) -> int:
	var count: int = 0
	var radius_sq: float = radius * radius
	for egg in eggs:
		if egg != null and is_instance_valid(egg) and egg.active:
			if egg.global_position.distance_squared_to(position) <= radius_sq:
				count += 1
	return count

func _is_valid_spawner_egg_position(position: Vector3) -> bool:
	if Vector2(position.x, position.z).length() > config.map_radius:
		return false
	for egg in eggs:
		if egg == null or not is_instance_valid(egg) or not egg.active:
			continue
		if egg.global_position.distance_squared_to(position) < config.spawner_lay_min_egg_distance * config.spawner_lay_min_egg_distance:
			return false
	return true

func _random_ring_offset(min_distance: float, max_distance: float) -> Vector3:
	var angle: float = rng.randf_range(0.0, TAU)
	var distance: float = rng.randf_range(min_distance, max_distance)
	return Vector3(cos(angle) * distance, 0.0, sin(angle) * distance)

func _random_ground_position(min_radius: float, max_radius: float) -> Vector3:
	var angle: float = rng.randf_range(0.0, TAU)
	var distance: float = rng.randf_range(min_radius, max_radius)
	return Vector3(cos(angle) * distance, 0.0, sin(angle) * distance)

func _clamp_to_ground(position: Vector3) -> Vector3:
	var flat: Vector2 = Vector2(position.x, position.z)
	if flat.length() > config.map_radius:
		flat = flat.normalized() * config.map_radius
	position.x = flat.x
	position.y = 0.0
	position.z = flat.y
	return position

func _spawn_mother_egg() -> void:
	mother_spawned = true
	var player_pos: Vector3 = player.global_position if player != null else Vector3.ZERO
	var away: Vector2 = Vector2(player_pos.x, player_pos.z)
	if away.length_squared() <= 0.01:
		away = Vector2.RIGHT
	away = -away.normalized()
	away = away.rotated(rng.randf_range(-0.7, 0.7))
	var spawn_position: Vector3 = Vector3(away.x, 0.0, away.y) * (config.map_radius * 0.82)
	mother_egg = MOTHER_EGG_SCENE.instantiate()
	add_child(mother_egg)
	mother_egg.global_position = spawn_position
	mother_egg.configure(self, config, config.egg_mature_time)
	eggs.append(mother_egg)
	for i in range(config.mother_guardians):
		var offset: Vector3 = _random_ring_offset(3.5, 8.0)
		spawn_enemy(GameTypes.EnemyType.GUARDIAN, spawn_position + offset, mother_egg)

func request_level_up() -> void:
	if result_finished or level_up_open or player == null:
		return
	level_up_open = true
	gameplay_paused = true
	level_screen.show_choices(player.make_upgrade_choices(rng))

func _on_upgrade_chosen(upgrade_id: int) -> void:
	if player != null:
		player.apply_upgrade(upgrade_id)
	level_up_open = false
	gameplay_paused = false

func on_player_form_changed(next_form: int) -> void:
	if camera_rig != null:
		camera_rig.set_bird_view(next_form == GameTypes.PlayerForm.BIRD)

func is_gameplay_paused() -> bool:
	return gameplay_paused or result_finished or level_up_open

func is_result_finished() -> bool:
	return result_finished

func get_map_radius() -> float:
	return config.map_radius

func win_game() -> void:
	if result_finished:
		return
	result_finished = true
	victory = true
	gameplay_paused = true
	result_screen.show_result(true, "母卵を破壊しました", play_time)

func lose_game(reason: String) -> void:
	if result_finished:
		return
	result_finished = true
	victory = false
	gameplay_paused = true
	result_screen.show_result(false, reason, play_time)

func _restart() -> void:
	get_tree().reload_current_scene()

func _update_hud() -> void:
	if hud == null:
		return
	var time_left: float = maxf(0.0, config.game_duration - play_time)
	var mother_hp: float = 0.0
	var mother_max_hp: float = 0.0
	var mother_alert_position: Vector2 = Vector2.ZERO
	var mother_alert_visible: bool = false
	if _is_mother_active():
		mother_hp = mother_egg.hp
		mother_max_hp = mother_egg.max_hp
		var mother_alert_state: Dictionary = _get_mother_alert_state()
		mother_alert_position = mother_alert_state["position"]
		mother_alert_visible = mother_alert_state["visible"]
	hud.update_values(
		player,
		time_left,
		eggs.size(),
		enemies.size(),
		mother_spawned,
		mother_hp,
		mother_max_hp,
		mother_alert_position,
		mother_alert_visible,
		gameplay_paused and not level_up_open and not result_finished,
		_make_debug_text()
	)

func _is_mother_active() -> bool:
	return mother_egg != null and is_instance_valid(mother_egg) and mother_egg.active

func _get_mother_alert_state() -> Dictionary:
	var state: Dictionary = {
		"position": Vector2.ZERO,
		"visible": false
	}
	var viewport: Viewport = get_viewport()
	var camera: Camera3D = viewport.get_camera_3d()
	if camera == null:
		return state
	var viewport_size: Vector2 = viewport.get_visible_rect().size
	if viewport_size.x <= 1.0 or viewport_size.y <= 1.0:
		return state
	var world_position: Vector3 = mother_egg.global_position + Vector3(0.0, 2.2, 0.0)
	var screen_position: Vector2 = camera.unproject_position(world_position)
	var behind_camera: bool = camera.is_position_behind(world_position)
	var on_screen: bool = not behind_camera and screen_position.x >= 0.0 and screen_position.y >= 0.0 and screen_position.x <= viewport_size.x and screen_position.y <= viewport_size.y
	if on_screen:
		return state
	var center: Vector2 = viewport_size * 0.5
	var direction: Vector2 = screen_position - center
	if behind_camera:
		direction = -direction
	if direction.length_squared() <= 1.0:
		direction = Vector2.UP
	direction = direction.normalized()
	var margin: float = 58.0
	var half_extent: Vector2 = viewport_size * 0.5 - Vector2.ONE * margin
	half_extent.x = maxf(half_extent.x, 1.0)
	half_extent.y = maxf(half_extent.y, 1.0)
	var scale_x: float = half_extent.x / absf(direction.x) if absf(direction.x) > 0.001 else INF
	var scale_y: float = half_extent.y / absf(direction.y) if absf(direction.y) > 0.001 else INF
	state["position"] = center + direction * minf(scale_x, scale_y)
	state["visible"] = true
	return state

func _make_debug_text() -> String:
	var active_projectiles: int = 0
	for projectile in projectile_pool:
		if projectile.active:
			active_projectiles += 1
	var active_orbs: int = 0
	for orb in orb_pool:
		if orb.active:
			active_orbs += 1
	var form_name: String = "BIRD" if player != null and player.form == GameTypes.PlayerForm.BIRD else "HUMAN"
	var burst: float = player.burst_gauge if player != null else 0.0
	return "F3 DEBUG\nform=%s time=%.1f burst=%.0f\neggs=%d enemies=%d grid_cells=%d\nprojectiles=%d/%d orbs=%d/%d" % [
		form_name,
		play_time,
		burst,
		eggs.size(),
		enemies.size(),
		enemy_grid.size(),
		active_projectiles,
		projectile_pool.size(),
		active_orbs,
		orb_pool.size()
	]

func _play_burst_sound() -> void:
	if burst_audio_player == null:
		return
	burst_audio_player.play()
	var playback = burst_audio_player.get_stream_playback()
	if playback == null:
		return
	var sample_count: int = 3600
	for i in range(sample_count):
		var t: float = float(i) / 22050.0
		var envelope: float = maxf(0.0, 1.0 - t / 0.16)
		var wave: float = sin(TAU * (120.0 + 380.0 * t) * t) * 0.35 * envelope
		playback.push_frame(Vector2(wave, wave))
