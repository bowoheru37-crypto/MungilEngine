package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.R

val SpaceGroteskFamily = FontFamily(Font(R.font.space_grotesk, FontWeight.Normal))
val PlusJakartaFamily = FontFamily(Font(R.font.plus_jakarta_sans, FontWeight.Normal))
val JetBrainsMonoFamily = FontFamily(Font(R.font.jetbrains_mono, FontWeight.Normal))

fun buildAppTypography(basePx: Int = 14): Typography {
    val scale = (basePx.coerceIn(12, 18) / 14f)
    return Typography(
        displaySmall = TextStyle(
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.ExtraBold,
            fontSize = (28f * scale).sp,
            lineHeight = (34f * scale).sp
        ),
        headlineSmall = TextStyle(
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.Bold,
            fontSize = (20f * scale).sp,
            lineHeight = (26f * scale).sp
        ),
        titleMedium = TextStyle(
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.Bold,
            fontSize = (16f * scale).sp,
            lineHeight = (22f * scale).sp
        ),
        titleSmall = TextStyle(
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = (14f * scale).sp,
            lineHeight = (18f * scale).sp
        ),
        bodyLarge = TextStyle(
            fontFamily = PlusJakartaFamily,
            fontWeight = FontWeight.Normal,
            fontSize = (15f * scale).sp,
            lineHeight = (21f * scale).sp
        ),
        bodyMedium = TextStyle(
            fontFamily = PlusJakartaFamily,
            fontWeight = FontWeight.Normal,
            fontSize = (13f * scale).sp,
            lineHeight = (18f * scale).sp
        ),
        bodySmall = TextStyle(
            fontFamily = PlusJakartaFamily,
            fontWeight = FontWeight.Medium,
            fontSize = (11.5f * scale).sp,
            lineHeight = (16f * scale).sp
        ),
        labelLarge = TextStyle(
            fontFamily = SpaceGroteskFamily,
            fontWeight = FontWeight.Bold,
            fontSize = (13f * scale).sp,
            lineHeight = (16f * scale).sp
        ),
        labelSmall = TextStyle(
            fontFamily = JetBrainsMonoFamily,
            fontWeight = FontWeight.Medium,
            fontSize = (10.5f * scale).sp,
            lineHeight = (14f * scale).sp
        )
    )
}
