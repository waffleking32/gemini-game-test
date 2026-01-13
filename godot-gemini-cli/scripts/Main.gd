extends Node

@onready var ui = $UI
@onready var game_container = $GameContainer

var player_scene = preload("res://scenes/Player.tscn")
var moon_scene = preload("res://scenes/Moon.tscn")

var time_left = 60.0
var game_active = false
var current_difficulty = 0

func _ready():
	ui.connect("start_game", _on_start_game)
	ui.connect("restart_game", _on_restart_game)

func _process(delta):
	if game_active:
		time_left -= delta
		ui.update_time(time_left)
		
		if time_left <= 0:
			game_over(false)

func _on_start_game(difficulty):
	current_difficulty = difficulty
	start_round()

func _on_restart_game():
	start_round()

func start_round():
	game_active = true
	time_left = 60.0
	
	# Clear old game
	for child in game_container.get_children():
		child.queue_free()
	
	# Spawn Moon
	var moon = moon_scene.instantiate()
	moon.position = Vector2(0, 0)
	moon.connect("moon_destroyed", _on_moon_destroyed)
	game_container.add_child(moon)
	
	# Spawn Player
	var player = player_scene.instantiate()
	player.position = Vector2(0, 300) # Start below moon
	player.set_difficulty(current_difficulty)
	game_container.add_child(player)
	
	# Apply difficulty to global context if needed or just pass to player/moon
	# The bullet logic reads difficulty when spawned or we can set a global
	# Simpler: Player passes difficulty to bullets or configures itself
	
	ui.show_hud()

func _on_moon_destroyed():
	if game_active:
		game_over(true)

func game_over(win):
	game_active = false
	ui.show_game_over(win)
	# Cleanup player if wanted, or let them fly around
	if not win:
		# Maybe explode player?
		pass
