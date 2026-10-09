package com.homeloan.calculator.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.homeloan.calculator.model.*
import com.homeloan.calculator.ui.theme.*
import com.homeloan.calculator.util.CommaNumberVisualTransformation
import com.homeloan.calculator.util.Formatters
import com.homeloan.calculator.viewmodel.LoanCalculatorViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoanCalculatorScreen(
    viewModel: LoanCalculatorViewModel = androidx.lifecycle.viewmodel.compose.viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("คำนวณ", "ตารางผ่อน", "อัตรา MRR")

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
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = TextMuted
                            )
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = NavyDark
                )
            )
        },
        bottomBar = {
            NavigationBar(
                containerColor = CardBackground,
                contentColor = TextPrimary
            ) {
                tabs.forEachIndexed { index, title ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = {
                            when (index) {
                                0 -> Icon(Icons.Default.Calculate, contentDescription = title)
                                1 -> Icon(Icons.Default.TableChart, contentDescription = title)
                                else -> Icon(Icons.Default.AccountBalance, contentDescription = title)
                            }
                        },
                        label = { Text(title) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = GlowingGreen,
                            selectedTextColor = GlowingGreen,
                            indicatorColor = CardBorder
                        )
                    )
                }
            }
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (selectedTab) {
                0 -> CalculatorTabContent(uiState, viewModel)
                1 -> AmortizationTabContent(uiState)
                2 -> MrrTabContent(uiState)
            }
        }
    }
}

@Composable
fun CalculatorTabContent(
    uiState: com.homeloan.calculator.viewmodel.LoanCalculatorUiState,
    viewModel: LoanCalculatorViewModel
) {
    var rawAmount by remember(uiState.loanAmount) {
        mutableStateOf(if (uiState.loanAmount > 0) "%.2f".format(uiState.loanAmount) else "")
    }
    var rawYears by remember(uiState.loanTermYears) {
        mutableStateOf(uiState.loanTermYears.toString())
    }
    var rawEqualPayment by remember(uiState.equalPaymentAmount) {
        mutableStateOf(if (uiState.equalPaymentAmount > 0) "%.2f".format(uiState.equalPaymentAmount) else "")
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        contentPadding = PaddingValues(vertical = 16.dp)
    ) {
        // Hero Glowing Green Loan Amount Card
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .border(
                        width = 1.5.dp,
                        brush = Brush.horizontalGradient(
                            colors = listOf(EmeraldGreen.copy(alpha = 0.6f), GlowingGreen)
                        ),
                        shape = RoundedCornerShape(16.dp)
                    )
                    .shadow(
                        elevation = 8.dp,
                        shape = RoundedCornerShape(16.dp),
                        ambientColor = GlowingGreen,
                        spotColor = GlowingGreen
                    ),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "วงเงินกู้ (บาท)",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    // Glowing Green Number - Exactly Formatted e.g. 1,356,995.00 บาท
                    Text(
                        text = "${Formatters.formatMoney(uiState.loanAmount)} บาท",
                        style = MaterialTheme.typography.headlineLarge.copy(
                            color = GlowingGreen,
                            fontWeight = FontWeight.ExtraBold,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 26.sp
                        ),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "ระยะเวลาผ่อน ${Formatters.formatYears(uiState.loanTermYears)} ปี (${Formatters.formatYears(uiState.loanTermYears * 12)} งวด)",
                        style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                    )
                }
            }
        }

        // Main Input Fields Card
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(CardBorder, CardBorder)))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = "ข้อมูลสินเชื่อหลัก",
                        style = MaterialTheme.typography.titleMedium.copy(
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold
                        )
                    )

                    // Loan Amount Input
                    OutlinedTextField(
                        value = rawAmount,
                        onValueChange = { newVal ->
                            val clean = newVal.filter { it.isDigit() || it == '.' }
                            rawAmount = clean
                            val num = clean.toDoubleOrNull() ?: 0.0
                            viewModel.setLoanAmount(num)
                        },
                        label = { Text("ระบุวงเงินกู้ (บาท)") },
                        supportingText = {
                            Text(
                                "จำนวนเต็มทศนิยม 2 ตำแหน่ง: ${Formatters.formatMoney(uiState.loanAmount)} บาท",
                                color = GlowingGreen
                            )
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = GlowingGreen,
                            unfocusedBorderColor = CardBorder,
                            focusedLabelColor = GlowingGreen
                        )
                    )

                    // Loan Term (Years) Input - Integer without decimals
                    OutlinedTextField(
                        value = rawYears,
                        onValueChange = { newVal ->
                            val clean = newVal.filter { it.isDigit() }
                            rawYears = clean
                            val years = clean.toIntOrNull() ?: 30
                            viewModel.setLoanTermYears(years)
                        },
                        label = { Text("ระยะเวลากู้ (ปี - ไม่ต้องใส่จุดทศนิยม)") },
                        supportingText = {
                            Text(
                                "ระยะเวลากู้: ${Formatters.formatYears(uiState.loanTermYears)} ปี",
                                color = SkyBlue
                            )
                        },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = SkyBlue,
                            unfocusedBorderColor = CardBorder,
                            focusedLabelColor = SkyBlue
                        )
                    )
                }
            }
        }

        // Calculation Results Metrics
        item {
            val result = uiState.calculationResult
            if (result != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBackground),
                    border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(CardBorder, CardBorder)))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text(
                            text = "สรุปผลการคำนวณ",
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        )

                        SummaryRow("ยอดผ่อนชำระรวมทั้งหมด", "${Formatters.formatMoney(result.totalPayments)} บาท", GlowingGreen)
                        SummaryRow("ดอกเบี้ยจ่ายรวม", "${Formatters.formatMoney(result.totalInterest)} บาท", AmberWarning)
                        SummaryRow("เงินต้นชำระรวม", "${Formatters.formatMoney(result.totalPrincipal)} บาท", SkyBlue)
                        SummaryRow("ระยะเวลาผ่อนจริง", "${Formatters.formatYears(result.actualTermMonths)} เดือน (${Formatters.formatYears(result.actualTermMonths / 12)} ปี)", TextPrimary)
                    }
                }
            }
        }

        // Step Rates Summary
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(CardBorder, CardBorder)))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "อัตราดอกเบี้ยขั้นบันได (Step Rate)",
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }

                    uiState.interestSteps.forEachIndexed { idx, step ->
                        val effectiveRate = com.homeloan.calculator.engine.LoanCalculatorEngine.getEffectiveRate(step)
                        val startYear = (step.startMonth - 1) / 12 + 1
                        val endYear = step.endMonth / 12
                        val yearLabel = if (step.endMonth >= 360) "ปีที่ $startYear เป็นต้นไป" else "ปีที่ $startYear - $endYear"

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(CardBorder.copy(alpha = 0.5f))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = yearLabel,
                                style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary)
                            )
                            Text(
                                text = "${Formatters.formatPercent(effectiveRate)}",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = GlowingGreen,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun SummaryRow(label: String, value: String, valueColor: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, style = MaterialTheme.typography.bodyMedium.copy(color = TextSecondary))
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium.copy(
                color = valueColor,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace
            )
        )
    }
}

@Composable
fun AmortizationTabContent(uiState: com.homeloan.calculator.viewmodel.LoanCalculatorUiState) {
    val schedule = uiState.calculationResult?.schedule ?: emptyList()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        item {
            Text(
                text = "ตารางผ่อนชำระรายเดือน (${Formatters.formatYears(schedule.size)} งวด)",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(schedule.take(120)) { month ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(CardBorder, CardBorder)))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "งวดที่ ${Formatters.formatYears(month.month)} (ปี ${Formatters.formatYears(month.year)})",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = TextPrimary,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                        Text(
                            text = "ดอกเบี้ย ${Formatters.formatPercent(month.interestRate)}",
                            style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "ยอดชำระ: ${Formatters.formatMoney(month.payment)} บาท",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = GlowingGreen,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = "คงเหลือ: ${Formatters.formatMoney(month.endingBalance)} บาท",
                            style = MaterialTheme.typography.labelSmall.copy(color = TextSecondary)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun MrrTabContent(uiState: com.homeloan.calculator.viewmodel.LoanCalculatorUiState) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text(
                text = "อัตราดอกเบี้ย MRR ธนาคารพาณิชย์",
                style = MaterialTheme.typography.titleMedium.copy(
                    color = TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            )
            Text(
                text = "อ้างอิงประกาศล่าสุดสำหรับสินเชื่อที่อยู่อาศัย",
                style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
            )
            Spacer(modifier = Modifier.height(8.dp))
        }

        items(uiState.selectedBankMrr) { bank ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                border = CardDefaults.outlinedCardBorder().copy(brush = Brush.linearGradient(listOf(CardBorder, CardBorder)))
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = bank.name,
                            style = MaterialTheme.typography.titleMedium.copy(
                                color = GlowingGreen,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = bank.fullName,
                            style = MaterialTheme.typography.bodySmall.copy(color = TextSecondary)
                        )
                        Text(
                            text = "อัปเดต: ${bank.updateDate}",
                            style = MaterialTheme.typography.labelSmall.copy(color = TextMuted)
                        )
                    }

                    Text(
                        text = "${Formatters.formatPercent(bank.mrr)}",
                        style = MaterialTheme.typography.headlineMedium.copy(
                            color = SkyBlue,
                            fontWeight = FontWeight.ExtraBold
                        )
                    )
                }
            }
        }
    }
}
