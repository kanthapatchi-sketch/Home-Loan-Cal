# Home Loan Step Calculator - Android Native App (Kotlin)

A native Android application built using **Kotlin**, **Jetpack Compose**, and the **Android SDK (SDK 35/36)**.

## Key Features

1. **Precision Home Loan Calculations (ลดต้นลดดอก)**:
   - Monthly amortization calculation with exact daily/monthly reducing balance.
   - Dynamic step-down / step-up interest rates (Year 1, Year 2, Year 3, Floating MRR with custom margin).
   - Equal monthly payments vs Step payments vs Extra principal pre-payments.

2. **Strict Financial Number Formatting**:
   - Thousands separators (`1,356,995.00`) on all currency inputs and results.
   - Exactly 2 decimal places for all money figures.
   - Whole numbers (no decimals) for years, months, and installment counts.
   - Glowing emerald green hero display for loan amount (`1,356,995.00 บาท`).

3. **Modern Android Tech Stack**:
   - Kotlin 2.1.0
   - Jetpack Compose with Material 3 Design
   - Kotlin Coroutines & StateFlow Architecture
   - AndroidX Lifecycle ViewModel

## How to Open in Android Studio

1. Open **Android Studio** (Ladybug / Koala / Hedgehog or newer).
2. Select **Open** and choose this `android/` directory.
3. Allow Gradle to sync dependencies.
4. Run on an Android Device or Android Emulator (API 24+).

## Building from Command Line

```bash
cd android
./gradlew assembleDebug
```
The APK will be generated at:
`app/build/outputs/apk/debug/app-debug.apk`
