package com.homeloan.calculator

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
}
