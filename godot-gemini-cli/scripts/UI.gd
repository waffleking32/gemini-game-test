extends CanvasLayer

signal start_game(difficulty)
signal restart_game

@onready var main_menu = $MainMenu
@onready var hud = $HUD
@onready var game_over = $GameOver
@onready var timer_label = $HUD/TimerLabel
@onready var result_label = $GameOver/VBoxContainer/ResultLabel
@onready var cheese_trophy = $GameOver/CheeseTrophy

func _ready():
	show_main_menu()

func show_main_menu():
	main_menu.visible = true
	hud.visible = false
	game_over.visible = false

func show_hud():
	main_menu.visible = false
	hud.visible = true
	game_over.visible = false

func show_game_over(win: bool):
	main_menu.visible = false
	hud.visible = false
	game_over.visible = true
	
	if win:
		result_label.text = "YOU WIN!"
		cheese_trophy.visible = true
	else:
		result_label.text = "TIME'S UP!"
		cheese_trophy.visible = false

func update_time(time_left):
	timer_label.text = "Time: %.1f" % time_left

func _on_easy_pressed():
	emit_signal("start_game", 0)

func _on_medium_pressed():
	emit_signal("start_game", 1)

func _on_hard_pressed():
	emit_signal("start_game", 2)

func _on_restart_pressed():
	emit_signal("restart_game")
