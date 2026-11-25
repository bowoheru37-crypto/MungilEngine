# Mungil Engine V7 ProGuard / R8 Keep Rules
-keep class com.example.engine.** { *; }
-keepattributes *Annotation*,Signature
-dontwarn kotlinx.serialization.**
