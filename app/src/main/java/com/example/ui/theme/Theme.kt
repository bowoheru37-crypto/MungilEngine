package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColors = darkColorScheme(
    primary = SkyAccent,
    onPrimary = MidnightBg,
    secondary = EmeraldAccent,
    onSecondary = MidnightBg,
    tertiary = AmberGold,
    background = MidnightBg,
    onBackground = TextLight,
    surface = MidnightSurface,
    onSurface = TextLight,
    surfaceVariant = MidnightSurfaceVariant,
    onSurfaceVariant = TextMutedDark,
    outline = MidnightBorder,
    error = RoseDanger,
    onError = Color.White
)

private val LightColors = lightColorScheme(
    primary = SkyAccentDark,
    onPrimary = Color.White,
    secondary = EmeraldAccentDark,
    onSecondary = Color.White,
    tertiary = AmberGold,
    background = LightBg,
    onBackground = TextDark,
    surface = LightSurface,
    onSurface = TextDark,
    surfaceVariant = LightSurfaceVariant,
    onSurfaceVariant = TextMutedLight,
    outline = LightBorder,
    error = RoseDanger,
    onError = Color.White
)

private val HighContrastColors = darkColorScheme(
    primary = HighContrastAccent,
    onPrimary = Color.Black,
    secondary = HighContrastSecondary,
    onSecondary = Color.Black,
    tertiary = SkyAccent,
    background = HighContrastBg,
    onBackground = Color.White,
    surface = HighContrastSurface,
    onSurface = Color.White,
    surfaceVariant = Color(0xFF1A1A1A),
    onSurfaceVariant = Color(0xFFE5E5E5),
    outline = Color.White,
    error = Color(0xFFFF4D6D),
    onError = Color.Black
)

@Composable
fun MungilEngineTheme(
    darkTheme: Boolean = true,
    highContrast: Boolean = false,
    fontSizePx: Int = 14,
    content: @Composable () -> Unit
) {
    val scheme = when {
        highContrast -> HighContrastColors
        darkTheme -> DarkColors
        else -> LightColors
    }
    MaterialTheme(
        colorScheme = scheme,
        typography = buildAppTypography(fontSizePx),
        content = content
    )
}
