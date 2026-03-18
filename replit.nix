{ pkgs }: {
	deps = [
   pkgs.android-tools
   pkgs.jdk17
   pkgs.imagemagick
		pkgs.kotlin
		pkgs.gradle
		pkgs.maven
		pkgs.kotlin-language-server
	];
}