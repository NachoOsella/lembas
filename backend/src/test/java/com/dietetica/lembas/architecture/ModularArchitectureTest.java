package com.dietetica.lembas.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.domain.JavaField;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;
import jakarta.annotation.Resource;
import jakarta.inject.Inject;
import jakarta.persistence.Entity;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceUnit;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RestController;

/**
 * Executable baseline for the feature-oriented modular monolith.
 *
 * <p>The repository allowlist is intentionally represented as concrete source and target
 * classes. It documents migration debt without allowing an entire package or module to
 * bypass the boundary rule.</p>
 */
class ModularArchitectureTest {

    static final String BASE_PACKAGE = "com.dietetica.lembas";

    private static final Set<String> FEATURE_MODULES = Set.of(
            "audit",
            "auth",
            "cash",
            "catalog",
            "content",
            "inventory",
            "orders",
            "payments",
            "pos",
            "reports",
            "suppliers",
            "users");

    private static final Set<DependencyAccess> CROSS_MODULE_REPOSITORY_ALLOWLIST = Set.of(
            // Authentication still reads the users persistence model during migration.
            access("auth.service.AuthService", "users.repository.UserRepository"),
            access("auth.service.LembasUserDetailsService", "users.repository.UserRepository"),
            // Cash totals and operator identity still read payments/users persistence directly.
            access("cash.service.CashService", "payments.repository.PaymentRepository"),
            access("cash.service.CashService", "users.repository.UserRepository"),
            access("cash.service.CashService", "shared.branch.repository.BranchRepository"),
            // Catalog, inventory, orders, POS, and suppliers still share persistence lookups.
            access("catalog.service.ProductService", "inventory.repository.StockLotRepository"),
            access("catalog.service.ProductService", "shared.branch.repository.BranchRepository"),
            access("inventory.service.InventoryService", "catalog.repository.ProductRepository"),
            access("inventory.service.InventoryService", "orders.repository.OrderRepository"),
            access("inventory.service.InventoryService", "shared.branch.repository.BranchRepository"),
            access("orders.service.CustomerOrderService", "catalog.repository.ProductRepository"),
            access("orders.service.CustomerOrderService", "inventory.repository.StockLotRepository"),
            access("orders.service.CustomerOrderService", "shared.branch.repository.BranchRepository"),
            access("payments.service.MercadoPagoWebhookProcessor", "orders.repository.OrderRepository"),
            access("payments.service.PreferenceService", "orders.repository.OrderRepository"),
            access("pos.service.PosProductSearchService", "catalog.repository.ProductRepository"),
            access("pos.service.PosProductSearchService", "inventory.repository.StockLotRepository"),
            access("pos.service.PosSaleService", "catalog.repository.ProductRepository"),
            access("pos.service.PosSaleService", "inventory.repository.StockLotRepository"),
            access("pos.service.PosSaleService", "inventory.repository.StockMovementRepository"),
            access("pos.service.PosSaleService", "orders.repository.OrderRepository"),
            access("pos.service.PosSaleService", "shared.branch.repository.BranchRepository"),
            access("reports.service.RecommendationService", "shared.branch.repository.BranchRepository"),
            access("reports.service.ReportService", "shared.branch.repository.BranchRepository"),
            access("suppliers.service.PriceUpdateBatchService", "catalog.repository.CategoryRepository"),
            access("suppliers.service.PriceUpdateBatchService", "catalog.repository.ProductRepository"),
            access("suppliers.service.PriceUpdateBatchService", "catalog.repository.ProductSalePriceHistoryRepository"),
            access("suppliers.service.PurchaseOrderService", "shared.branch.repository.BranchRepository"),
            access("suppliers.service.PurchaseReceiptService", "inventory.repository.StockLotRepository"),
            access("suppliers.service.PurchaseReceiptService", "inventory.repository.StockMovementRepository"),
            access("suppliers.service.SupplierService", "catalog.repository.ProductRepository"),
            access("users.service.UserAdminService", "shared.branch.repository.BranchRepository"));

    private static final Set<DependencyAccess> SHARED_FEATURE_ALLOWLIST = Set.of(
            // Security configuration still wires the authentication filter across the boundary.
            access("shared.config.SecurityConfig", "auth.service.JwtAuthenticationFilter"));

    private static final Set<DependencyAccess> CONTROLLER_REPOSITORY_ALLOWLIST = Set.of(
            // Customer payment history still performs its read directly until a payment query API exists.
            access("payments.web.CustomerPaymentController", "payments.repository.PaymentRepository"));

    private static final Set<FieldInjection> FIELD_INJECTION_ALLOWLIST = Set.of(
            // The reporting repository still uses container-managed EntityManager field injection.
            field("reports.repository.ReportQueryRepository", "em", PersistenceContext.class));

    private static final ArchRule controllersDoNotDependOnRepositories = classes()
            .that()
            .areAnnotatedWith(RestController.class)
            .or()
            .areAnnotatedWith(Controller.class)
            .should(notDependOnRepositoriesExcept(CONTROLLER_REPOSITORY_ALLOWLIST));

    private static final ArchRule modelPackagesDoNotDependOnWebPackages = noClasses()
            .that()
            .resideInAnyPackage("..model..")
            .should()
            .dependOnClassesThat()
            .resideInAnyPackage("..web..");

    private static final ArchRule sharedPackagesDoNotDependOnFeatureModules = classes()
            .that()
            .resideInAnyPackage(BASE_PACKAGE + ".shared..")
            .should(notDependOnFeatureModulesExcept(SHARED_FEATURE_ALLOWLIST));

    private static final ArchRule productionCodeDoesNotUseFieldInjection =
            fields().should(notUseFieldInjectionExcept(FIELD_INJECTION_ALLOWLIST));

    private static final ArchRule crossModuleRepositoryAccessIsExplicitlyAllowlisted =
            classes().should(notDependOnCrossModuleRepositoriesExcept(CROSS_MODULE_REPOSITORY_ALLOWLIST));

    /**
     * Web classes may coordinate HTTP concerns with services and contracts, but may not reach
     * persistence repositories or unrelated layers directly.
     */
    private static final ArchRule webPackagesDependInward = classes()
            .that()
            .resideInAnyPackage("..web..")
            .should(notDependOutsideWebLayerExcept(CONTROLLER_REPOSITORY_ALLOWLIST));

    private static final ArchRule controllerMethodsDoNotExposeJpaEntities = methods()
            .that()
            .areDeclaredInClassesThat()
            .areAnnotatedWith(RestController.class)
            .or()
            .areDeclaredInClassesThat()
            .areAnnotatedWith(Controller.class)
            .should(notExposeJpaEntities());

    @TestFactory
    Stream<DynamicTest> modularArchitectureRules() {
        JavaClasses importedClasses = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages(BASE_PACKAGE);
        return Stream.of(
                DynamicTest.dynamicTest(
                        "controllers do not depend on repositories",
                        () -> controllersDoNotDependOnRepositories.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "model packages do not depend on web packages",
                        () -> modelPackagesDoNotDependOnWebPackages.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "shared packages do not depend on feature modules",
                        () -> sharedPackagesDoNotDependOnFeatureModules.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "production code does not use field injection",
                        () -> productionCodeDoesNotUseFieldInjection.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "cross-module repository access is explicitly allowlisted",
                        () -> crossModuleRepositoryAccessIsExplicitlyAllowlisted.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "web packages depend inward", () -> webPackagesDependInward.check(importedClasses)),
                DynamicTest.dynamicTest(
                        "controller methods do not expose JPA entities",
                        () -> controllerMethodsDoNotExposeJpaEntities.check(importedClasses)));
    }

    private static ArchCondition<JavaField> notUseFieldInjectionExcept(Set<FieldInjection> allowlist) {
        return new ArchCondition<>("not use field injection except the explicit allowlist") {
            @Override
            public void check(JavaField field, ConditionEvents events) {
                for (String annotationName : FIELD_INJECTION_ANNOTATIONS) {
                    if (!field.isAnnotatedWith(annotationName) || allowlist.contains(field(field, annotationName))) {
                        continue;
                    }

                    events.add(SimpleConditionEvent.violated(
                            field, field(field, annotationName) + " is not in the explicit field-injection allowlist"));
                }
            }
        };
    }

    private static ArchCondition<JavaClass> notDependOnRepositoriesExcept(Set<DependencyAccess> allowlist) {
        return new ArchCondition<>("not depend on repositories except the explicit controller allowlist") {
            @Override
            public void check(JavaClass sourceClass, ConditionEvents events) {
                for (Dependency dependency : sourceClass.getDirectDependenciesFromSelf()) {
                    JavaClass targetClass = dependency.getTargetClass();
                    if (isRepository(targetClass) && !allowlist.contains(access(sourceClass, targetClass))) {
                        events.add(SimpleConditionEvent.violated(
                                sourceClass,
                                access(sourceClass, targetClass)
                                        + " is not in the explicit controller repository allowlist"));
                    }
                }
            }
        };
    }

    private static ArchCondition<JavaClass> notDependOutsideWebLayerExcept(Set<DependencyAccess> allowlist) {
        return new ArchCondition<>("only depend inward on web, service, DTO, model, or shared packages") {
            @Override
            public void check(JavaClass sourceClass, ConditionEvents events) {
                for (Dependency dependency : sourceClass.getDirectDependenciesFromSelf()) {
                    JavaClass targetClass = dependency.getTargetClass();
                    if (isAllowedWebDependency(sourceClass, targetClass)
                            || allowlist.contains(access(sourceClass, targetClass))) {
                        continue;
                    }

                    events.add(SimpleConditionEvent.violated(
                            sourceClass,
                            access(sourceClass, targetClass)
                                    + " is outside the allowed inward web-layer dependencies"));
                }
            }
        };
    }

    private static ArchCondition<JavaMethod> notExposeJpaEntities() {
        return new ArchCondition<>("not expose a JPA entity in the response signature") {
            @Override
            public void check(JavaMethod method, ConditionEvents events) {
                for (JavaClass returnType : method.getReturnType().getAllInvolvedRawTypes()) {
                    if (returnType.isAnnotatedWith(Entity.class)) {
                        events.add(SimpleConditionEvent.violated(
                                method, method.getFullName() + " returns or wraps JPA entity " + returnType.getName()));
                    }
                }
            }
        };
    }

    private static ArchCondition<JavaClass> notDependOnCrossModuleRepositoriesExcept(Set<DependencyAccess> allowlist) {
        return new ArchCondition<>("not depend on repositories owned by another module except the explicit allowlist") {
            @Override
            public void check(JavaClass sourceClass, ConditionEvents events) {
                String sourceModule = moduleName(sourceClass);
                if (sourceModule == null) {
                    return;
                }

                for (Dependency dependency : sourceClass.getDirectDependenciesFromSelf()) {
                    JavaClass targetClass = dependency.getTargetClass();
                    String targetModule = moduleName(targetClass);
                    if (!isRepository(targetClass) || targetModule == null || sourceModule.equals(targetModule)) {
                        continue;
                    }

                    DependencyAccess access = access(sourceClass, targetClass);
                    if (!allowlist.contains(access)) {
                        events.add(SimpleConditionEvent.violated(
                                sourceClass, access + " is not in the explicit cross-module repository allowlist"));
                    }
                }
            }
        };
    }

    private static ArchCondition<JavaClass> notDependOnFeatureModulesExcept(Set<DependencyAccess> allowlist) {
        return new ArchCondition<>("not depend on feature modules except the explicit allowlist") {
            @Override
            public void check(JavaClass sourceClass, ConditionEvents events) {
                for (Dependency dependency : sourceClass.getDirectDependenciesFromSelf()) {
                    JavaClass targetClass = dependency.getTargetClass();
                    if (!isFeatureModule(targetClass)) {
                        continue;
                    }

                    DependencyAccess access = access(sourceClass, targetClass);
                    if (!allowlist.contains(access)) {
                        events.add(SimpleConditionEvent.violated(
                                sourceClass, access + " is not in the explicit shared-to-feature allowlist"));
                    }
                }
            }
        };
    }

    private static final Set<String> FIELD_INJECTION_ANNOTATIONS = Set.of(
            Autowired.class.getName(),
            Inject.class.getName(),
            Resource.class.getName(),
            PersistenceContext.class.getName(),
            PersistenceUnit.class.getName(),
            Value.class.getName());

    private static boolean isRepository(JavaClass javaClass) {
        String packageName = javaClass.getPackageName();
        return packageName.endsWith(".repository") || packageName.contains(".repository.");
    }

    private static boolean isAllowedWebDependency(JavaClass sourceClass, JavaClass targetClass) {
        String targetPackage = targetClass.getPackageName();
        if (!targetPackage.startsWith(BASE_PACKAGE + ".")) {
            return targetPackage.startsWith("java.")
                    || targetPackage.startsWith("jakarta.")
                    || targetPackage.startsWith("org.")
                    || targetPackage.startsWith("io.swagger.");
        }
        if ("shared".equals(moduleName(targetClass))) {
            return true;
        }
        return targetPackage.contains(".service")
                || targetPackage.contains(".dto")
                || targetPackage.contains(".model")
                || (moduleName(sourceClass).equals(moduleName(targetClass)) && targetPackage.contains(".web"));
    }

    private static boolean isFeatureModule(JavaClass javaClass) {
        String module = moduleName(javaClass);
        return module != null && FEATURE_MODULES.contains(module);
    }

    private static String moduleName(JavaClass javaClass) {
        String packageName = javaClass.getPackageName();
        String prefix = BASE_PACKAGE + ".";
        if (!packageName.startsWith(prefix)) {
            return null;
        }

        String remainder = packageName.substring(prefix.length());
        int separator = remainder.indexOf('.');
        return separator < 0 ? remainder : remainder.substring(0, separator);
    }

    private static DependencyAccess access(String sourceRelativeName, String targetRelativeName) {
        return new DependencyAccess(BASE_PACKAGE + "." + sourceRelativeName, BASE_PACKAGE + "." + targetRelativeName);
    }

    private static DependencyAccess access(JavaClass sourceClass, JavaClass targetClass) {
        return new DependencyAccess(sourceClass.getName(), targetClass.getName());
    }

    private static FieldInjection field(String sourceRelativeName, String fieldName, Class<?> annotation) {
        return new FieldInjection(BASE_PACKAGE + "." + sourceRelativeName, fieldName, annotation.getName());
    }

    private static FieldInjection field(JavaField field, String annotationName) {
        return new FieldInjection(field.getOwner().getName(), field.getName(), annotationName);
    }

    private record DependencyAccess(String sourceClass, String targetClass) {}

    private record FieldInjection(String sourceClass, String fieldName, String annotationName) {}
}
