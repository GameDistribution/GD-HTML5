function atob(str) {
  if (str) {
    return new Buffer(str, "base64").toString("binary");
  }
  return null;
}

module.exports = function (grunt) {
  const startTS = Date.now();

  grunt.initConfig({
    /**
     * This will load in our package.json file so we can have access
     * to the project name and appVersion number.
     */
    pkg: grunt.file.readJSON("package.json"),

    /**
     * Copies certain files over from the src folder to the build folder.
     */
    copy: {
      development: {
        expand: true,
        flatten: true,
        cwd: "./",
        src: ["index.html", "blocked.html", "deleted.html"],
        dest: "./lib/"
      },
      legacy: {
        src: ["./lib/main.min.js"],
        dest: "./lib/libs/gd/api.js"
      }
    },

    /**
     * Cleans our build folder.
     */
    clean: {
      lib: {
        src: ["./lib"]
      }
    },

    /**
     * A code block that will be added to our minified code files.
     * Gets the name and appVersion and other info from the above loaded 'package.json' file.
     * @example <%= banner.join("\\n") %>
     */
    banner: [
      "/*",
      "* Project: <%= pkg.name %>",
      "* Description: <%= pkg.description %>",
      "* Development By: <%= pkg.author %>",
      '* Copyright(c): <%= grunt.template.today("yyyy") %>',
      '* Version: <%= pkg.version %> (<%= grunt.template.today("dd-mm-yyyy HH:MM") %>)',
      "*/"
    ],

    /**
     * Prepends the banner above to the minified files.
     */
    usebanner: {
      options: {
        position: "top",
        banner: '<%= banner.join("\\n") %>',
        linebreak: true
      },
      files: {
        src: ["lib/main.min.js"]
      }
    },

    /**
     * Browserify is used to support the latest version of javascript.
     * We also concat it while we're at it.
     * We only use Browserify for the mobile sites.
     */
    browserify: {
      options: {
        transform: [
          [
            "babelify",
            {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    debug: false
                  }
                ]
              ],
              plugins: [["@babel/plugin-transform-runtime"]]
            }
          ]
        ]
      },
      lib: {
        src: "src/**/*.js",
        dest: "lib/main.js"
      },
      blocked: {
        src: "blocked/blocked.js",
        dest: "lib/blocked.js"
      },
      deleted: {
        src: "deleted/deleted.js",
        dest: "lib/deleted.js"
      }
    },

    /**
     * Do some javascript post processing, like minifying and removing comments.
     */
    uglify: {
      options: {
        position: "top",
        linebreak: true,
        sourceMap: false,
        sourceMapIncludeSources: false,
        compress: {
          sequences: true,
          dead_code: true,
          conditionals: true,
          booleans: true,
          unused: true,
          if_return: true,
          join_vars: true,
          keep_fnames: true
        },
        mangle: {
          reserved: ['SDKDeprecated']
        },
        beautify: false,
        warnings: false
      },
      lib: {
        src: "lib/main.js",
        dest: "lib/main.min.js"
      },
      blocked: {
        src: "lib/blocked.js",
        dest: "lib/blocked.min.js"
      },
      deleted: {
        src: "lib/deleted.js",
        dest: "lib/deleted.min.js"
      }
    },

    /**
     * Setup a simple watcher.
     */
    watch: {
      options: {
        spawn: false,
        debounceDelay: 250
      },
      scripts: {
        files: ["src/**/*.js", "blocked/**/*.js"],
        tasks: ["browserify", "uglify", "duration"]
      },
      html: {
        files: ["index.html", "blocked.html", "deleted.html"]
      },
      grunt: {
        files: ["gruntfile.js"]
      }
    },

    /**
     * Start browser sync, which setups a local node server based on the server root location.
     * This task helps with cross browser testing and general workflow.
     */
    browserSync: {
      bsFiles: {
        src: ["lib/", "index.html", "blocked.html", "deleted.html"]
      },
      options: {
        server: "./",
        watchTask: true,
        port: 3000
      }
    }
  });

  // General tasks.
  grunt.loadNpmTasks("grunt-exec");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-google-cloud");
  grunt.loadNpmTasks("grunt-browser-sync");
  grunt.loadNpmTasks("grunt-contrib-watch");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-banner");

  // Register all tasks.
  grunt.registerTask(
    "duration",
    "Displays the duration of the grunt task up until this point.",
    function () {
      const date = new Date(Date.now() - startTS);
      let hh = date.getUTCHours();
      let mm = date.getUTCMinutes();
      let ss = date.getSeconds();
      if (hh < 10) {
        hh = "0" + hh;
      }
      if (mm < 10) {
        mm = "0" + mm;
      }
      if (ss < 10) {
        ss = "0" + ss;
      }
      console.log("Duration: " + hh + ":" + mm + ":" + ss);
    }
  );
  grunt.registerTask("sourcemaps", "Build with sourcemaps", function () {
    grunt.config.set("uglify.options.sourceMap", true);
    grunt.config.set("uglify.options.sourceMapIncludeSources", true);
  });
  grunt.registerTask(
    "default",
    "Start BrowserSync and watch for any changes so we can do live updates while developing.",
    function () {
      const tasksArray = [
        "copy:development",
        "browserify",
        "sourcemaps",
        "uglify",
        "usebanner",
        "duration",
        "browserSync",
        "watch"
      ];
      grunt.task.run(tasksArray);
    }
  );
  grunt.registerTask("build", "Build and optimize the js.", function () {
    const tasksArray = [
      "clean",
      "browserify",
      "uglify",
      "usebanner",
      "copy:legacy",
      "duration"
    ];
    grunt.task.run(tasksArray);
  });
  grunt.registerTask("buildsync", "Build and optimize the js.", function () {
    const tasksArray = [
      "clean",
      "browserify",
      "uglify",
      "usebanner",
      "copy:legacy",
      "watch"
    ];
    grunt.task.run(tasksArray);
  });
  grunt.registerTask(
    "blocked",
    "Build and optimize the blocked js.",
    function () {
      const tasksArray = [
        "browserify:blocked",
        "uglify:blocked",
        "duration"
      ];
      grunt.task.run(tasksArray);
    }
  );
  grunt.registerTask(
    "deleted",
    "Build and optimize the deleted js.",
    function () {
      const tasksArray = [
        "browserify:deleted",
        "uglify:deleted",
        "duration"
      ];
      grunt.task.run(tasksArray);
    }
  );
  grunt.registerTask("deploy", "Upload the build files.", function () {
    const project = grunt.option("project"), // vooxe-gamedistribution
      bucket = grunt.option("bucket"), // gd-sdk-html5
      folderIn = grunt.option("in"), //
      folderOut = grunt.option("out"); //

    // The key is saved as a system parameter within Team City.
    // The service account key of our google cloud account for uploading to
    // storage is stringified and then encoded as base64 using btoa()
    // console.log(grunt.option('key'));
    let keyObj = grunt.option("key");
    let key = JSON.parse(atob(keyObj));
    // console.log(key);

    if (project === undefined) {
      grunt.fail.warn("Cannot upload without a project name");
    }

    if (bucket === undefined) {
      grunt.fail.warn("OW DEAR GOD THEY ARE STEALING MAH BUCKET!");
    }

    if (key === undefined || key === null) {
      grunt.fail.warn("Cannot upload without an auth key");
    } else {
      console.log("Key loaded...");
    }

    grunt.config.merge({
      gcs: {
        options: {
          credentials: key,
          project: project,
          bucket: bucket,
          gzip: true,
          metadata: {
            "surrogate-key": "gcs"
          }
        },
        dist: {
          cwd: "./lib/",
          src: ["**/*"],
          dest: ""
        }
      }
    });

    console.log("Project: " + project);
    console.log("Bucket: " + bucket);

    if (folderIn === undefined && folderOut === undefined) {
      console.log("Deploying: ./lib/ to gs://" + bucket + "/");
    } else {
      if (folderIn !== undefined) {
        if (folderOut === undefined) {
          grunt.fail.warn('No use in specifying "in" without "out"');
        }
        console.log(
          "Deploying: ../" + folderIn + " to gs://" + bucket + "/" + folderOut
        );
        grunt.config.set("gcs.dist", {
          cwd: "../" + folderIn,
          src: ["**/*"],
          dest: folderOut
        });
      } else if (folderOut !== undefined) {
        grunt.fail.warn('No use in specifying "out" without "in"');
      }
    }

    grunt.task.run("gcs");
  });
  grunt.registerTask(
    "archive",
    "Upload the build files to version folders.",
    function () {
      const project = grunt.option("project"), // vooxe-gamedistribution
        bucket = grunt.option("bucket"); // gd-sdk-html5

      // The key is saved as a system parameter within Team City.
      // The service account key of our google cloud account for uploading to
      // storage is stringified and then encoded as base64 using btoa()
      // console.log(grunt.option('key'));
      let keyObj = grunt.option("key");
      let key = JSON.parse(atob(keyObj));
      // console.log(key);

      if (project === undefined) {
        grunt.fail.warn("Cannot upload without a project name");
      }

      if (bucket === undefined) {
        grunt.fail.warn("OW DEAR GOD THEY ARE STEALING MAH BUCKET!");
      }

      if (key === undefined || key === null) {
        grunt.fail.warn("Cannot upload without an auth key");
      } else {
        console.log("Key loaded...");
      }

      grunt.config.merge({
        gcs: {
          options: {
            credentials: key,
            project: project,
            bucket: bucket,
            gzip: true,
            metadata: {
              "surrogate-key": "gcs"
            }
          },
          dist: {
            cwd: "./lib/",
            src: ["**/*"],
            dest: "v/<%= pkg.version %>/"
          }
        }
      });

      console.log("Project: " + project);
      console.log("Bucket: " + bucket);

      console.log("Deploying: ./lib/ to gs://" + bucket + "/");

      grunt.task.run("gcs");
    }
  );
};
