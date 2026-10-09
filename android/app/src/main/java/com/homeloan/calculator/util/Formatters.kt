package com.homeloan.calculator.util

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object Formatters {

    private val symbols = DecimalFormatSymbols(Locale("th", "TH")).apply {
        groupingSeparator = ','
        decimalSeparator = '.'
    }

    private val moneyFormat = DecimalFormat("#,##0.00", symbols)
    private val yearsFormat = DecimalFormat("#,##0", symbols)
    private val percentFormat = DecimalFormat("0.00", symbols)

    /**
     * Formats any double value as Thai currency string with commas and exactly 2 decimal places.
     * Example: 1356995.0 -> "1,356,995.00"
     */
    fun formatMoney(value: Double?): String {
        if (value == null) return "0.00"
        return moneyFormat.format(value)
    }

    /**
     * Formats year value as integer string without decimals.
     * Example: 30 -> "30"
     */
    fun formatYears(value: Int?): String {
        if (value == null) return "0"
        return yearsFormat.format(value)
    }

    /**
     * Formats interest percentage with 2 decimals.
     * Example: 3.5 -> "3.50%"
     */
    fun formatPercent(value: Double?): String {
        if (value == null) return "0.00%"
        return "${percentFormat.format(value)}%"
    }

    /**
     * Clean numeric string: removes commas, spaces.
     */
    fun cleanNumber(raw: String): Double {
        val sanitized = raw.replace(",", "").trim()
        return sanitized.toDoubleOrNull() ?: 0.0
    }
}

/**
 * VisualTransformation for Jetpack Compose TextField that automatically inserts
 * thousands commas while keeping raw digits in the state.
 */
class CommaNumberVisualTransformation(
    private val allowDecimal: Boolean = true
) : VisualTransformation {

    override fun filter(text: AnnotatedString): TransformedText {
        val raw = text.text
        if (raw.isEmpty()) {
            return TransformedText(text, OffsetMapping.Identity)
        }

        val parts = raw.split(".")
        val intPart = parts[0]
        val formattedInt = buildString {
            for (i in intPart.indices) {
                if (i > 0 && (intPart.length - i) % 3 == 0) {
                    append(',')
                }
                append(intPart[i])
            }
        }

        val out = if (parts.size > 1 && allowDecimal) {
            "$formattedInt.${parts[1]}"
        } else {
            formattedInt
        }

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                if (offset <= 0) return 0
                val originalSub = raw.take(offset)
                val originalParts = originalSub.split(".")
                val originalInt = originalParts[0]
                var commasBefore = 0
                for (i in originalInt.indices) {
                    if (i > 0 && (intPart.length - i) % 3 == 0) {
                        commasBefore++
                    }
                }
                return (offset + commasBefore).coerceAtMost(out.length)
            }

            override fun transformedToOriginal(offset: Int): Int {
                if (offset <= 0) return 0
                val transformedSub = out.take(offset)
                val commasInSub = transformedSub.count { it == ',' }
                return (offset - commasInSub).coerceIn(0, raw.length)
            }
        }

        return TransformedText(AnnotatedString(out), offsetMapping)
    }
}
