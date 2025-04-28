package com.jerryz.caffeine;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // 确保不是全屏模式
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
        // 设置状态栏颜色
        getWindow().setStatusBarColor(getResources().getColor(R.color.colorPrimaryDark));
        //setContentView(R.layout.activity_main);
    }
}
