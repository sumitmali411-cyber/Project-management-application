<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>

  <#if section = "header">
    ${msg("loginAccountTitle")}

  <#elseif section = "form">

    <#if realm.password>
      <form id="kc-form-login" onsubmit="login.disabled = true; return true;"
            action="${url.loginAction}" method="post">

        <#if !usernameHidden??>
          <div class="${properties.kcFormGroupClass!}">
            <label for="username">
              <#if !realm.loginWithEmailAllowed>
                ${msg("username")}
              <#elseif !realm.registrationEmailAsUsername>
                ${msg("usernameOrEmail")}
              <#else>
                ${msg("email")}
              </#if>
            </label>
            <input
              tabindex="1"
              id="username"
              class="${properties.kcInputClass!}"
              name="username"
              value="${(login.username!'')?html}"
              type="text"
              autofocus
              autocomplete="username"
              placeholder="<#if !realm.loginWithEmailAllowed>username<#elseif !realm.registrationEmailAsUsername>username or email<#else>you@company.com</#if>"
              aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
            />
            <#if messagesPerField.existsError('username','password')>
              <span class="${properties.kcInputErrorMessageClass!}" aria-live="polite">
                ${kcSanitize(messagesPerField.getFirstError('username','password'))?no_esc}
              </span>
            </#if>
          </div>
        </#if>

        <div class="${properties.kcFormGroupClass!}">
          <label for="password">${msg("password")}</label>
          <#if realm.resetPasswordAllowed>
            <a tabindex="5" href="${url.loginResetCredentialsUrl}"
               style="float:right;font-size:0.78rem;margin-top:0.1rem">
              ${msg("doForgotPassword")}
            </a>
          </#if>
          <input
            tabindex="2"
            id="password"
            class="${properties.kcInputClass!}"
            name="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            aria-invalid="<#if messagesPerField.existsError('username','password')>true</#if>"
          />
        </div>

        <#if realm.rememberMe && !usernameHidden??>
          <div class="${properties.kcFormGroupClass!} ${properties.kcFormSettingClass!}">
            <div class="${properties.kcFormOptionsWrapperClass!}">
              <div class="checkbox">
                <label>
                  <#if login.rememberMe??>
                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox"
                           checked> ${msg("rememberMe")}
                  <#else>
                    <input tabindex="3" id="rememberMe" name="rememberMe" type="checkbox">
                    ${msg("rememberMe")}
                  </#if>
                </label>
              </div>
            </div>
          </div>
        </#if>

        <div id="kc-form-buttons" class="${properties.kcFormGroupClass!}">
          <input type="hidden" id="id-hidden-input" name="credentialId"
                 <#if auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
          <input tabindex="4" class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}"
                 name="login" id="kc-login" type="submit" value="${msg("doLogIn")}"/>
        </div>
      </form>
    </#if>

  <#elseif section = "info">
    <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
      <div id="kc-registration" style="text-align:center;margin-top:1.25rem;font-size:0.875rem;color:var(--muted)">
        ${msg("noAccount")}
        <a tabindex="6" href="${url.registrationUrl}"
           style="font-weight:600;margin-left:4px">${msg("doRegister")}</a>
      </div>
    </#if>
  </#if>

</@layout.registrationLayout>
