package com.dalibaba.dali;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Android 15(targetSdk 35)의 강제 edge-to-edge를 비활성화해서
        // 시스템이 상태바/내비게이션바 영역을 자동으로 비워주도록 함
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    }
}
