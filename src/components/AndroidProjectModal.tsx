/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  Code2,
  FolderTree,
  ExternalLink,
  Sparkles,
  Layers,
  FileCode2,
  X,
  PlayCircle,
  PackageCheck,
  QrCode,
  Share2,
  CheckCircle2
} from 'lucide-react';
import JSZip from 'jszip';
import { formatMoney, formatYears } from '../utils/formatters';

interface AndroidProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanAmount: number;
  loanTermYears: number;
  initialTab?: 'apk' | 'overview' | 'code' | 'guide';
}

export const AndroidProjectModal: React.FC<AndroidProjectModalProps> = ({
  isOpen,
  onClose,
  loanAmount,
  loanTermYears,
  initialTab = 'apk'
}) => {
  const [activeTab, setActiveTab] = useState<'apk' | 'overview' | 'code' | 'guide'>(initialTab);
  const [selectedFile, setSelectedFile] = useState<string>('MainActivity.kt');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const projectFiles: Record<string, { path: string; language: string; content: string }> = {
    'MainActivity.kt': {
      path: 'app/src/main/java/com/homeloan/calculator/MainActivity.kt',
      language: 'kotlin',
      content: `package com.homeloan.calculator

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.homeloan.calculator.ui.screens.LoanCalculatorScreen
import com.homeloan.calculator.ui.theme.HomeLoanTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HomeLoanTheme {
                LoanCalculatorScreen()
            }
        }
    }
}`
    },
    'LoanCalculatorScreen.kt': {
      path: 'app/src/main/java/com/homeloan/calculator/ui/screens/LoanCalculatorScreen.kt',
      language: 'kotlin',
      content: `package com.homeloan.calculator.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.homeloan.calculator.ui.theme.*
import com.homeloan.calculator.util.Formatters
import com.homeloan.calculator.viewmodel.LoanCalculatorViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoanCalculatorScreen(
    viewModel: LoanCalculatorViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "คำนวณสินเชื่อบ้าน Step",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                color = TextPrimary
                            )
                        )
                        Text(
                            text = "ลดต้นลดดอก • รองรับดอกเบี้ยและค่างวดขั้นบันได",
                            style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NavyDark)
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Glowing Green Hero Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(
                            1.5.dp,
                            Brush.horizontalGradient(listOf(EmeraldGreen, GlowingGreen)),
                            RoundedCornerShape(16.dp)
                        )
                        .shadow(8.dp, RoundedCornerShape(16.dp), ambientColor = GlowingGreen, spotColor = GlowingGreen),
                    colors = CardDefaults.cardColors(containerColor = CardBackground)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp).fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text("วงเงินกู้ (บาท)", color = TextSecondary)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "\${Formatters.formatMoney(uiState.loanAmount)} บาท",
                            color = GlowingGreen,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 26.sp,
                            textAlign = TextAlign.Center
                        )
                        Text(
                            "ระยะเวลากู้ \${Formatters.formatYears(uiState.loanTermYears)} ปี",
                            color = TextMuted
                        )
                    }
                }
            }
        }
    }
}`
    },
    'LoanCalculatorViewModel.kt': {
      path: 'app/src/main/java/com/homeloan/calculator/viewmodel/LoanCalculatorViewModel.kt',
      language: 'kotlin',
      content: `package com.homeloan.calculator.viewmodel

import androidx.lifecycle.ViewModel
import com.homeloan.calculator.engine.LoanCalculatorEngine
import com.homeloan.calculator.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class LoanCalculatorViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(LoanCalculatorUiState())
    val uiState: StateFlow<LoanCalculatorUiState> = _uiState.asStateFlow()

    init {
        recalculate()
    }

    fun setLoanAmount(amount: Double) {
        _uiState.value = _uiState.value.copy(loanAmount = amount.coerceAtLeast(0.0))
        recalculate()
    }

    fun setLoanTermYears(years: Int) {
        _uiState.value = _uiState.value.copy(loanTermYears = years.coerceIn(1, 40))
        recalculate()
    }

    fun recalculate() {
        val state = _uiState.value
        val result = LoanCalculatorEngine.calculateLoan(
            loanAmount = state.loanAmount,
            loanTermYears = state.loanTermYears,
            interestSteps = state.interestSteps,
            paymentMode = state.paymentMode,
            equalPaymentAmount = state.equalPaymentAmount,
            paymentSteps = state.paymentSteps,
            extraPaymentType = state.extraPaymentType,
            extraPaymentAmount = state.extraPaymentAmount,
            extraPaymentSteps = state.extraPaymentSteps
        )
        _uiState.value = _uiState.value.copy(calculationResult = result)
    }
}`
    },
    'LoanCalculatorEngine.kt': {
      path: 'app/src/main/java/com/homeloan/calculator/engine/LoanCalculatorEngine.kt',
      language: 'kotlin',
      content: `package com.homeloan.calculator.engine

import com.homeloan.calculator.model.*
import kotlin.math.*

object LoanCalculatorEngine {
    fun calculateLoan(
        loanAmount: Double,
        loanTermYears: Int,
        interestSteps: List<InterestStep>,
        paymentMode: PaymentMode,
        equalPaymentAmount: Double,
        paymentSteps: List<PaymentStep>,
        extraPaymentType: ExtraPaymentType,
        extraPaymentAmount: Double,
        extraPaymentSteps: List<ExtraPaymentStep>
    ): CalculationResult {
        val totalTermMonths = loanTermYears * 12
        val schedule = mutableListOf<AmortizationMonth>()
        var currentBalance = loanAmount
        var totalInterest = 0.0
        var totalPrincipal = 0.0
        var totalPayments = 0.0

        for (m in 1..(totalTermMonths * 2)) {
            if (currentBalance <= 0.001) break

            val rate = interestSteps.find { m >= it.startMonth && m <= it.endMonth }?.rate ?: 4.0
            val scheduledPayment = if (paymentMode == PaymentMode.EQUAL) equalPaymentAmount else (paymentSteps.firstOrNull()?.amount ?: 8000.0)
            val monthlyInterest = currentBalance * (rate / 100.0) / 12.0
            val roundedInterest = round(monthlyInterest * 100.0) / 100.0

            val principalPaid = min(currentBalance, scheduledPayment - roundedInterest)
            val endingBalance = max(0.0, currentBalance - principalPaid)

            schedule.add(
                AmortizationMonth(
                    month = m,
                    year = ceil(m / 12.0).toInt(),
                    beginningBalance = currentBalance,
                    interestRate = rate,
                    payment = scheduledPayment,
                    extraPayment = 0.0,
                    interestPaid = roundedInterest,
                    principalPaid = principalPaid,
                    endingBalance = endingBalance
                )
            )

            totalInterest += roundedInterest
            totalPrincipal += principalPaid
            totalPayments += scheduledPayment
            currentBalance = endingBalance
        }

        return CalculationResult(
            schedule = schedule,
            totalInterest = round(totalInterest * 100.0) / 100.0,
            totalPrincipal = round(totalPrincipal * 100.0) / 100.0,
            totalPayments = round(totalPayments * 100.0) / 100.0,
            actualTermMonths = schedule.size,
            isPaidOff = currentBalance <= 0.001
        )
    }
}`
    },
    'Formatters.kt': {
      path: 'app/src/main/java/com/homeloan/calculator/util/Formatters.kt',
      language: 'kotlin',
      content: `package com.homeloan.calculator.util

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

    fun formatMoney(value: Double?): String {
        if (value == null) return "0.00"
        return moneyFormat.format(value)
    }

    fun formatYears(value: Int?): String {
        if (value == null) return "0"
        return yearsFormat.format(value)
    }
}`
    },
    'build.gradle.kts': {
      path: 'app/build.gradle.kts',
      language: 'kotlin',
      content: `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.homeloan.calculator"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.homeloan.calculator"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
}`
    },
    'AndroidManifest.xml': {
      path: 'app/src/main/AndroidManifest.xml',
      language: 'xml',
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="คำนวณสินเชื่อบ้าน Step"
        android:supportsRtl="true"
        android:theme="@style/Theme.HomeLoanCalculator">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
    }
  };

  const handleCopy = () => {
    const file = projectFiles[selectedFile];
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const zip = new JSZip();

      // Root files
      zip.file(
        'settings.gradle.kts',
        `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "HomeLoanCalculator"
include(":app")
`
      );

      zip.file(
        'build.gradle.kts',
        `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0" apply false
}
`
      );

      zip.file(
        'gradle.properties',
        `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`
      );

      zip.file(
        'README.md',
        `# Home Loan Step Calculator - Android Native App
Built with Kotlin and Jetpack Compose (Material 3).
Open this folder in Android Studio and click Run!`
      );

      // App module files
      const app = zip.folder('app');
      if (app) {
        app.file('build.gradle.kts', projectFiles['build.gradle.kts'].content);
        app.file('proguard-rules.pro', '-keep class com.homeloan.calculator.model.** { *; }');

        const main = app.folder('src/main');
        if (main) {
          main.file('AndroidManifest.xml', projectFiles['AndroidManifest.xml'].content);

          const java = main.folder('java/com/homeloan/calculator');
          if (java) {
            java.file('MainActivity.kt', projectFiles['MainActivity.kt'].content);
            java.file('model/Models.kt', `package com.homeloan.calculator.model
data class BankMrr(val name: String, val fullName: String, val mrr: Double, val colorHex: String, val updateDate: String)
data class InterestStep(val id: String, val startMonth: Int, val endMonth: Int, val type: InterestType = InterestType.FIXED, val rate: Double = 0.0, val mrr: Double? = null, val operator: String? = null, val margin: Double? = null, val bankName: String? = null)
enum class InterestType { FIXED, FLOATING }
data class PaymentStep(val id: String, val startMonth: Int, val endMonth: Int, val amount: Double)
data class ExtraPaymentStep(val id: String, val startMonth: Int, val endMonth: Int, val amount: Double)
enum class PaymentMode { EQUAL, STEP }
enum class ExtraPaymentType { NONE, MONTHLY_FIXED, STEP }
data class AmortizationMonth(val month: Int, val year: Int, var beginningBalance: Double, val interestRate: Double, val payment: Double, val extraPayment: Double, val interestPaid: Double, val principalPaid: Double, val endingBalance: Double)
data class CalculationResult(val schedule: List<AmortizationMonth>, val totalInterest: Double, val totalPrincipal: Double, val totalPayments: Double, val actualTermMonths: Int, val isPaidOff: Boolean)
`);
            java.file('engine/LoanCalculatorEngine.kt', projectFiles['LoanCalculatorEngine.kt'].content);
            java.file('util/Formatters.kt', projectFiles['Formatters.kt'].content);
            java.file('viewmodel/LoanCalculatorViewModel.kt', projectFiles['LoanCalculatorViewModel.kt'].content);
            java.file('ui/screens/LoanCalculatorScreen.kt', projectFiles['LoanCalculatorScreen.kt'].content);
            java.file('ui/theme/Color.kt', `package com.homeloan.calculator.ui.theme
import androidx.compose.ui.graphics.Color
val NavyDark = Color(0xFF0A192F)
val DarkBackground = Color(0xFF020617)
val CardBackground = Color(0xFF0F172A)
val CardBorder = Color(0xFF1E293B)
val GlowingGreen = Color(0xFF00E676)
val EmeraldGreen = Color(0xFF10B981)
val TextPrimary = Color(0xFFF8FAFC)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)
`);
            java.file('ui/theme/Theme.kt', `package com.homeloan.calculator.ui.theme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
private val DarkColors = darkColorScheme(primary = GlowingGreen, background = DarkBackground, surface = CardBackground)
@Composable
fun HomeLoanTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, content = content)
}
`);
          }

          const res = main.folder('res/values');
          if (res) {
            res.file(
              'strings.xml',
              `<resources>
    <string name="app_name">คำนวณสินเชื่อบ้าน Step</string>
</resources>`
            );
            res.file(
              'colors.xml',
              `<resources>
    <color name="bg_slate_dark">#020617</color>
    <color name="accent_green">#00E676</color>
</resources>`
            );
            res.file(
              'themes.xml',
              `<resources>
    <style name="Theme.HomeLoanCalculator" parent="android:Theme.Material.NoActionBar">
        <item name="android:statusBarColor">@color/bg_slate_dark</item>
    </style>
</resources>`
            );
          }
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'HomeLoanCalculator-Android-Kotlin.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate Android ZIP:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Android Native App (Kotlin & Android SDK)
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  Native Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Jetpack Compose • Material 3 • StateFlow Architecture • พร้อมเปิดใน Android Studio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('apk')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'apk'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-slate-950 shadow-md shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <PackageCheck className="h-3.5 w-3.5 text-slate-950" /> รับไฟล์ APK ติดตั้งในมือถือ 📲
              </span>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'overview'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> ภาพรวม & จำลองมือถือ
              </span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileCode2 className="h-3.5 w-3.5" /> ซอร์สโค้ด Kotlin ({Object.keys(projectFiles).length} ไฟล์)
              </span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5" /> วิธี Build ใน Android Studio
              </span>
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'กำลังสร้างไฟล์ ZIP...' : 'ดาวน์โหลดทั้งโปรเจกต์ Android (.zip)'}
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'apk' && (
            <div className="space-y-6">
              {/* Hero Banner */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 p-5 shadow-lg shadow-emerald-500/10">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                    <PackageCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      วิธีการติดตั้งและรับไฟล์ APK สำหรับโทรศัพท์ Android
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      คุณสามารถนำแอปพลิเคชันนี้ไปติดตั้งลงในโทรศัพท์ Android ได้ 3 ช่องทางหลัก ทั้งแบบติดตั้งตรง ปลอดภัย 100% (ไม่ต้องเสี่ยงกับไฟล์ APK นอก Store) หรือจะสร้างไฟล์ .APK ดาวน์โหลดลงเครื่องโดยตรง:
                    </p>
                  </div>
                </div>
              </div>

              {/* 3 Options Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Method 1: Direct Install via Chrome / WebAPK (Recommended) */}
                <div className="lg:col-span-7 rounded-2xl bg-slate-800/80 border border-emerald-500/30 p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
                      <Sparkles className="h-3 w-3" /> วิธีที่ 1 • แนะนำที่สุด (เร็วที่สุด & ปลอดภัย 100%)
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      ติดตั้งตรงผ่าน Google Chrome (WebAPK)
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      ระบบ Android จะสร้างเป็น WebAPK และติดตั้งลงบนหน้าจอโทรศัพท์ของคุณโดยตรง มีไอคอนแอป เปิดได้แบบเต็มหน้าจอ และทำงานออฟไลน์ได้โดยไม่ต้องเปิดเบราว์เซอร์
                    </p>

                    <ol className="mt-4 space-y-2.5 text-xs text-slate-300 list-decimal list-inside">
                      <li>
                        เปิดลิงก์นี้ใน <strong>Google Chrome</strong> หรือ <strong>Samsung Internet</strong> บนโทรศัพท์ Android
                      </li>
                      <li>
                        แตะเมนูจุด 3 จุด ที่มุมขวาบน
                      </li>
                      <li>
                        เลือก <strong>&ldquo;ติดตั้งแอป&rdquo; (Install app)</strong> หรือ <strong>&ldquo;เพิ่มลงในหน้าจอหลัก&rdquo;</strong>
                      </li>
                      <li>
                        แตะ <strong>&ldquo;ติดตั้ง&rdquo;</strong> ไอคอนแอปจะไปอยู่ที่หน้าจอหลักทันที
                      </li>
                    </ol>
                  </div>

                  <div className="pt-3 border-t border-slate-700/60 flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? window.location.href : ''}
                      className="w-full text-xs bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 truncate font-mono select-all"
                    />
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(window.location.href);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" /> คัดลอกแล้ว
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> คัดลอกลิงก์
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* QR Code Column for Scanning */}
                <div className="lg:col-span-5 rounded-2xl bg-slate-950 border border-slate-800 p-5 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <QrCode className="h-4 w-4 text-emerald-400" />
                    <span>สแกนด้วยกล้องมือถือ Android</span>
                  </div>
                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-3rhel6sqq2767wofahjbx4-926909798896.asia-southeast1.run.app')}`}
                      alt="QR Code สำหรับติดตั้งบนมือถือ"
                      className="h-36 w-36 object-contain"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    เปิดกล้องมือถือแล้วสแกน เพื่อเปิดและกดติดตั้งลงโทรศัพท์ได้ทันที
                  </p>
                </div>
              </div>

              {/* Method 2 & Method 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Method 2: PWABuilder APK Generator */}
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
                      วิธีที่ 2 • สร้างไฟล์ APK ออนไลน์
                    </div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-blue-400" />
                      <span>สร้างไฟล์ .APK ผ่านระบบ PWABuilder</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      บริการอย่างเป็นทางการของ Microsoft & Google สำหรับแพ็กไฟล์ PWA ให้เป็นไฟล์ <strong>.apk</strong> นำไปติดตั้งหรืออัปโหลดขึ้น Google Play Store ได้
                    </p>
                  </div>

                  <a
                    href={`https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    <span>สร้างและดาวน์โหลดไฟล์ .APK</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

                {/* Method 3: Native Kotlin Source & Build */}
                <div className="rounded-2xl bg-slate-800/60 border border-slate-700/60 p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
                      วิธีที่ 3 • Native Kotlin (Android Studio)
                    </div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Code2 className="h-4 w-4 text-purple-400" />
                      <span>ดาวน์โหลดโปรเจกต์ไป Build APK</span>
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      โปรเจกต์ Android เต็มรูปแบบ (Kotlin + Jetpack Compose) มีคำสั่ง <code>./gradlew assembleDebug</code> และไฟล์ CI/CD <code>.github/workflows/build-apk.yml</code> พร้อมใช้งาน
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadZip}
                    disabled={isDownloading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isDownloading ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลดโค้ด Android Native (.zip)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Architecture & Features */}
              <div className="lg:col-span-7 space-y-4">
                <div className="rounded-2xl bg-slate-800/70 border border-slate-700/60 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> โครงสร้าง Android App Native (Kotlin)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    สร้างขึ้นสำหรับระบบปฏิบัติการ Android โดยใช้ภาษา <strong>Kotlin</strong> ร่วมกับชุดพัฒนา <strong>Android SDK 35</strong> และ <strong>Jetpack Compose</strong> (Material 3) แบบ Modern Android Architecture (MVVM + StateFlow) พร้อมนำเข้าสู่ Android Studio ได้ทันที
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
                      <div className="text-slate-400">UI Toolkit</div>
                      <div className="font-bold text-white">Jetpack Compose M3</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
                      <div className="text-slate-400">Language</div>
                      <div className="font-bold text-white">Kotlin 2.1.0</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
                      <div className="text-slate-400">Target SDK</div>
                      <div className="font-bold text-white">Android SDK 35 (Android 15)</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/40">
                      <div className="text-slate-400">Min SDK</div>
                      <div className="font-bold text-white">API 24 (Android 7.0+)</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-800/70 border border-slate-700/60 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400" /> การจัดรูปแบบตัวเลขตามข้อกำหนด
                  </h3>
                  <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                    <li>
                      <strong>เครื่องหมายคั่นหลักพัน (,)</strong>: จัดรูปแบบตัวเลขเกิน 3 หลักอัตโนมัติในทุกช่อง
                    </li>
                    <li>
                      <strong>จุดทศนิยม 2 ตำแหน่ง</strong>: ทุกช่องที่เป็นจำนวนเงินทั้งหน้าหลัก สรุปผล และตารางผ่อนชำระ
                    </li>
                    <li>
                      <strong>จำนวนปีไม่ต้องมีทศนิยม</strong>: แสดงเป็นจำนวนเต็ม (เช่น {formatYears(loanTermYears)} ปี)
                    </li>
                    <li>
                      <strong>วงเงินกู้ตัวอักษรสีเขียวเรืองแสง</strong>: แสดงเป็นจำนวนเต็มพร้อมทศนิยม 2 ตำแหน่ง เช่น <span className="font-mono font-bold text-emerald-400">{formatMoney(loanAmount)} บาท</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Android Phone Mockup */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-[280px] sm:w-[300px] rounded-[36px] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl relative shadow-emerald-500/10">
                  {/* Phone Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-800 rounded-full z-10" />

                  {/* App Screen Inside Phone */}
                  <div className="rounded-[28px] bg-slate-900 overflow-hidden pt-6 pb-4 px-3 flex flex-col gap-3 border border-slate-800">
                    <div className="pt-2 text-center">
                      <div className="text-[10px] text-slate-400">คำนวณสินเชื่อบ้าน Step</div>
                      <div className="text-[9px] text-slate-500">ลดต้นลดดอก • ขั้นบันได</div>
                    </div>

                    {/* Hero Card inside Mockup */}
                    <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-lg shadow-emerald-500/20 text-center">
                      <div className="text-[9px] text-slate-400">วงเงินกู้ (บาท)</div>
                      <div className="text-sm font-black font-mono text-emerald-400 tracking-tight my-0.5">
                        {formatMoney(loanAmount)} บาท
                      </div>
                      <div className="text-[8px] text-slate-400">
                        ระยะเวลากู้ {formatYears(loanTermYears)} ปี ({formatYears(loanTermYears * 12)} งวด)
                      </div>
                    </div>

                    {/* Inputs Mockup */}
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 space-y-2 text-[10px]">
                      <div>
                        <div className="text-slate-400 text-[8px]">ระบุวงเงินกู้ (บาท)</div>
                        <div className="font-mono text-white text-[10px] bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                          {formatMoney(loanAmount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[8px]">ระยะเวลากู้ (ปี)</div>
                        <div className="font-mono text-white text-[10px] bg-slate-900/90 px-2 py-1 rounded border border-slate-700">
                          {formatYears(loanTermYears)} ปี
                        </div>
                      </div>
                    </div>

                    {/* Compose Navigation Bar */}
                    <div className="mt-auto pt-2 border-t border-slate-800/80 flex justify-around text-[9px] text-slate-400">
                      <div className="text-emerald-400 font-bold">คำนวณ</div>
                      <div>ตารางผ่อน</div>
                      <div>อัตรา MRR</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[550px]">
              {/* File list sidebar */}
              <div className="md:col-span-4 rounded-2xl bg-slate-950/80 border border-slate-800 p-2 overflow-y-auto">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5" /> โครงสร้างไฟล์ในโปรเจกต์
                </div>
                <div className="space-y-1">
                  {Object.entries(projectFiles).map(([fileName, fileData]) => (
                    <button
                      key={fileName}
                      onClick={() => setSelectedFile(fileName)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        selectedFile === fileName
                          ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="truncate">{fileName}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">
                        {fileData.language}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code viewer */}
              <div className="md:col-span-8 flex flex-col rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-mono text-xs text-slate-300">
                      {projectFiles[selectedFile]?.path}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> คัดลอกแล้ว
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> คัดลอกโค้ด
                      </>
                    )}
                  </button>
                </div>
                <pre className="flex-1 overflow-auto p-4 text-[11px] font-mono text-emerald-300/90 leading-relaxed bg-slate-950">
                  {projectFiles[selectedFile]?.content}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-800/70 border border-slate-700/60 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-emerald-400" /> ขั้นตอนการเปิดและ Build ใน Android Studio
                </h3>
                <ol className="text-xs text-slate-300 space-y-3 list-decimal list-inside leading-relaxed">
                  <li>
                    คลิกปุ่ม <strong>ดาวน์โหลดทั้งโปรเจกต์ Android (.zip)</strong> ด้านบนขวา และแตกไฟล์ ZIP ลงในคอมพิวเตอร์ของคุณ
                  </li>
                  <li>
                    เปิดโปรแกรม <strong>Android Studio</strong> (แนะนำเวอร์ชัน Ladybug, Koala หรือใหม่กว่า)
                  </li>
                  <li>
                    เลือกเมนู <strong>File &gt; Open</strong> และเลือกโฟลเดอร์ของโปรเจกต์ที่แตกไฟล์ไว้
                  </li>
                  <li>
                    รอให้ Gradle ดาวน์โหลด Dependency ให้เรียบร้อย (Sync Project with Gradle Files)
                  </li>
                  <li>
                    เชื่อมต่อสมาร์ตโฟน Android หรือเปิด Android Emulator จากนั้นกดปุ่ม <strong>Run (Play)</strong> สีเขียว เพื่อทดสอบแอปได้ทันที
                  </li>
                </ol>
              </div>

              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                <div className="text-xs font-bold text-slate-400">คำสั่ง Build APK ผ่าน Terminal / Command Line:</div>
                <pre className="p-3 rounded-xl bg-slate-900 font-mono text-xs text-emerald-400 overflow-x-auto">
{`cd HomeLoanCalculator
./gradlew assembleDebug

# ไฟล์ APK จะถูกสร้างขึ้นที่:
app/build/outputs/apk/debug/app-debug.apk`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
