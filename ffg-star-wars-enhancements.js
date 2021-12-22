import { init as settings_init } from './scripts/settings.js'
import { log_msg as log } from './scripts/util.js'
import {
    init as attack_animation_init,
    attack_animation_check,
    attack_animation,
    configure_attack_animation
} from './scripts/animation.js'
import { init as opening_crawl_init, ready as opening_crawl_ready, select_opening_crawl } from './scripts/opening_crawl.js'
import { init as rename_init, rename_actors } from './scripts/rename.js'
import { create_datapad_journal } from './scripts/datapads.js'
import {
    init as dice_helper_init,
    dice_helper,
    create_and_populate_journal as dice_helper_setup
} from './scripts/dice_helper.js'
import { init as strain_reminder_init, strain_reminder } from './scripts/strain_reminder.js'
import { init as talent_checker_init, talent_checker } from './scripts/talent_checker.js'
import { shop_creator } from "./scripts/shop.js";
import { init as shop_generator_init, ready as shop_sheet_ready } from "./scripts/shop_sheet.js";
import { init as vehicle_roller_init, intercept_vehicle_roll, register_crew } from "./scripts/vehicle_roller.js";

Hooks.once('init', async function() {
	log('base_module', 'Initializing');

	settings_init();
	rename_init();
	attack_animation_init();
    dice_helper_init();
    strain_reminder_init();
    talent_checker_init();
    opening_crawl_init();
    shop_generator_init();
    vehicle_roller_init();

    log('base_module', 'registering helpers');
    Handlebars.registerHelper("iff", function (a, operator, b, opts) {
        var bool = false;
        switch (operator) {
            case "==":
                bool = a == b;
                break;
            case ">":
                bool = a > b;
                break;
            case "<":
                bool = a < b;
                break;
            case "!=":
                bool = a != b;
                break;
            case "contains":
                if (a && b) {
                    bool = a.includes(b);
                } else {
                    bool = false;
                }
                break;
            default:
                throw "Unknown operator " + operator;
        }

        if (bool) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });
    Handlebars.registerHelper('localize',
        function(str){
            return game.i18n.localize(str);
        }
    );
    Handlebars.registerHelper("times", function (times, opts) {
        var out = "";
        var i;
        var data = {};

        if ( times ) {
            for ( i = 0; i < times; i += 1 ) {
                data.index = i;
                out += opts.fn(this, {
                    data: data
                });
            }
        } else {

            out = opts.inverse(this);
        }

        return out;
    });

    log('base_module', 'Done registering helpers');
	log('base_module', 'Initializing finished');
});

Hooks.once('ready', () => {
    /* register functionality here */
    rename_actors();
    attack_animation_check();
    opening_crawl_ready();
    shop_sheet_ready();
    dice_helper();
    talent_checker();
    register_hooks();
    dice_helper_setup();
});

Hooks.on("getSceneControlButtons", (controls) => {
	if (game.user.isGM) {
		controls.push({
			name: game.i18n.localize("ffg-star-wars-enhancements.controls.name"),
			title: game.i18n.localize("ffg-star-wars-enhancements.controls.title"),
			layer: "ControlsLayer",
			icon: "fa fa-jedi",
			tools: [
				{
					name: game.i18n.localize("ffg-star-wars-enhancements.controls.opening-crawl.name"),
					title: game.i18n.localize("ffg-star-wars-enhancements.controls.opening-crawl.title"),
					icon: "fas fa-journal-whills",
					button: true,
					onClick: () => {
						select_opening_crawl();
					},
				},
				{
					name: game.i18n.localize("ffg-star-wars-enhancements.controls.new-journal-template.name"),
					title: game.i18n.localize("ffg-star-wars-enhancements.controls.new-journal-template.title"),
					icon: "fas fa-book-medical",
					button: true,
					onClick: () => {
						create_datapad_journal();
					},
				},
                {
					name: game.i18n.localize("ffg-star-wars-enhancements.shop.html.scene.name"),
					title: game.i18n.localize("ffg-star-wars-enhancements.shop.html.scene.title"),
					icon: "fas fa-shopping-cart",
					button: true,
					onClick: () => {
						shop_creator();
					},
				},
                {
					name: game.i18n.localize("ffg-star-wars-enhancements.attack-animation.custom.button-name"),
					title: game.i18n.localize("ffg-star-wars-enhancements.attack-animation.custom.button-title"),
					icon: "fas fa-bullseye",
					button: true,
					onClick: () => {
						configure_attack_animation();
					},
				},
			]
		});
	}
});

Hooks.on("dropActorSheetData", (...args) => {
    register_crew(...args);
})

function register_hooks() {
    libWrapper.register(
        'ffg-star-wars-enhancements',
        'game.ffg.RollFFG.prototype.toMessage',
        function (wrapped, ...args) {
            /*
                we may want to monkeypatch a different function in the future. this location doesn't seem to have access
                to the actual weapon in use. I'm not sure if we actually care yet, but worth considering.
             */
            var data = attack_animation(this, ...args);
            return wrapped(...data);
        }
    );
    libWrapper.register(
        'ffg-star-wars-enhancements',
        'Combat.prototype.createEmbeddedEntity',
        async function (wrapped, ...args) {
            /* do initial action which was requested */
            var created_data = await wrapped(args[0], args[1]);
            /* call the attack animation code */
            rename_actors(created_data, ...args);
            strain_reminder(created_data, ...args);
        }
    );
    libWrapper.register(
        'ffg-star-wars-enhancements',
        'game.ffg.DiceHelpers.displayRollDialog',
        async function (wrapped, ...args) {
            var data = await intercept_vehicle_roll(...args);
            return wrapped(...data);
        }
    );
}
